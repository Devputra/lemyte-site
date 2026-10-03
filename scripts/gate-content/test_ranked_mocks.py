"""Offline synthetic bank; no credentials or database helpers imported."""
import importlib.util
from pathlib import Path
import unittest
import random
from collections import Counter

spec = importlib.util.spec_from_file_location('ranked_mocks', Path(__file__).with_name('ranked_mocks.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class RankedMocksTest(unittest.TestCase):
    def setUp(self):
        self.subjects = [dict(id=s, code=s, name=s) for s in ('CS', 'EC')]
        self.topics = [dict(id=i, subject_id=s, name=n, section_kind=k) for i, s, n, k in [
            ('ga', None, 'Aptitude', 'GA'), ('math', 'CS', 'Calculus', 'FOUNDATION'),
            ('ecmath', 'EC', 'Calculus and Optimization', 'FOUNDATION'),
            ('discrete', 'CS', 'Discrete Mathematics', 'FOUNDATION'),
            ('diff', 'EC', 'Differential Equations', 'FOUNDATION'),
            ('logic', 'CS', 'Digital Logic', 'CORE'), ('alg', 'CS', 'Algorithms', 'CORE'),
            ('circuits', 'EC', 'Digital Circuits', 'CORE')]]
        self.rows = []
        for t in self.topics:
            for marks in (1, 2):
                for i in range(40 if t['id'] != 'logic' else 1):
                    ident = f"{t['id']}_{marks}_{i}"
                    self.rows.append(dict(id=ident, subject_id=t['subject_id'] or 'EC', topic_id=t['id'],
                        section_kind=t['section_kind'], marks=marks, markdown_content=f'Question {ident}',
                        status='PUBLISHED', source_kind='PYQ', grading_policy=None, syllabus_note=None))

    def paper(self, rows=None, mock=1):
        return m.build_paper('CS', mock, self.subjects, self.topics, self.rows if rows is None else rows)

    def test_exact_pattern_determinism_order_and_crossover(self):
        paper = self.paper()
        self.assertEqual(paper, self.paper(list(reversed(self.rows))))
        self.assertNotEqual(paper, self.paper(mock=2))
        self.assertEqual(len(paper), 65)
        self.assertEqual(sum(q['marks'] for q in paper), 100)
        self.assertEqual(Counter(q['marks'] for q in paper if q['section_kind'] == 'GA'), {1: 5, 2: 5})
        # Maths and core share one section, split by each topic's past-paper weight.
        self.assertEqual(Counter(q['marks'] for q in paper if q['section_kind'] != 'GA'), {1: 25, 2: 30})
        self.assertTrue(any(q['section_kind'] == 'FOUNDATION' for q in paper))
        self.assertEqual([q['marks'] for q in paper[:10]], [1]*5 + [2]*5)
        self.assertEqual([q['marks'] for q in paper[10:]], [1]*25 + [2]*30)
        self.assertTrue(any(q['topic_id'] == 'ecmath' for q in paper))
        # Scarce own-topic supply forces at least one crossover draw for a larger weight.
        extra = [{**q, 'id': 'weight_' + q['id'], 'markdown_content': self.rows[0]['markdown_content']}
                 for q in self.rows if q['topic_id'] == 'alg']
        for q in extra:
            q['topic_id'] = 'logic'
        crossed = self.paper(self.rows + extra)
        self.assertTrue(any(q['topic_id'] == 'circuits' for q in crossed))
        self.assertFalse(any(q['topic_id'] == 'diff' for q in paper))
        self.assertTrue(any(q['target_topic'] == 'discrete' for q in paper))

    def test_exclusions_and_global_dedupe(self):
        invalid = []
        for field, value in [('status', 'DRAFT'), ('source_kind', 'ORIGINAL'), ('grading_policy', 'MARKS_TO_ALL'),
                             ('syllabus_note', ''), ('topic_id', None)]:
            q = {**self.rows[0], 'id': field, field: value}
            invalid.append(q)
            self.assertFalse(m.eligible(q))
        copies = [{**q, 'id': 'copy_' + q['id'], 'markdown_content': q['markdown_content'] + '\n[gate-source other]\ngate-media://asset.png'} for q in self.rows]
        paper = self.paper(self.rows + invalid + copies + self.rows)
        self.assertEqual(len({q['id'] for q in paper}), 65)
        self.assertEqual(len({m.normalize_text(q['markdown_content']) for q in paper}), 65)
        self.assertFalse({q['id'] for q in paper} & {q['id'] for q in invalid})

    def test_normalisation_and_quotas(self):
        self.assertEqual(m.normalize_text('A + B!\n[gate-source abc]\ngate-media://x'), 'ab')
        self.assertEqual(m.normalize_name('Partial Differential Equations'), m.normalize_name('Ordinary Differential Equations'))
        self.assertEqual(m.normalize_name('Calculus and Optimization'), 'calculus')
        self.assertEqual(m.allocate_quotas({'a': 6, 'b': 3, 'c': 1}, {'a': 20, 'b': 20, 'c': 20}, 10), {'a': 6, 'b': 3, 'c': 1})
        self.assertEqual(m.allocate_quotas({'a': 100, 'b': 1}, {'a': 20, 'b': 2}, 9), {'a': 8, 'b': 1})
        self.assertEqual(m.allocate_quotas({'a': 100, 'b': 10, 'c': 1}, {'a': 1, 'b': 20, 'c': 2}, 9), {'a': 1, 'b': 7, 'c': 1})

    def test_matching_redistributes_mark_shortages_and_shared_questions(self):
        def q(i, marks):
            return dict(id=str(i), markdown_content=f'Unique {i}', marks=marks)
        shared = q(0, 1)
        pools = {'heavy': [shared, q(1, 1)],
                 'middle': [shared, q(2, 2), q(3, 2), q(4, 2)],
                 'light': [q(5, 1), q(6, 2)]}
        selected = m.select_section(pools, {'heavy': 100, 'middle': 10, 'light': 1},
                                    1, 3, random.Random('test'), set())
        self.assertEqual(Counter(q['marks'] for q in selected), {1: 1, 2: 3})
        self.assertEqual(Counter(q['target_topic'] for q in selected), {'heavy': 1, 'middle': 2, 'light': 1})
        self.assertEqual(len({q['id'] for q in selected}), 4)

    def test_shortage_fails_before_writes(self):
        with self.assertRaises(ValueError):
            self.paper([q for q in self.rows if q['marks'] == 1])


if __name__ == '__main__':
    unittest.main()
