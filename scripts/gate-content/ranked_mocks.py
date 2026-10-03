"""Assemble ranked PYQ papers. Only main() imports database helpers.

python3 ranked_mocks.py --subject CS --mock 1 [--dry]
python3 ranked_mocks.py --all --mock 1 [--dry]
"""
import argparse
from collections import Counter, deque
from datetime import datetime, timezone
import json
import random
import re
from urllib.parse import quote

BLUEPRINT = "GATE full paper (3 hours)"
# Explicit directed mappings: broad source topics are intentionally reviewable here.
CROSSOVER = {
    ("CS", "Digital Logic"): [("EC", "Digital Circuits")],
    ("EC", "Digital Circuits"): [("CS", "Digital Logic"), ("EE", "Analog and Digital Electronics")],
    ("EC", "Analog Circuits"): [("EE", "Analog and Digital Electronics")],
    ("EE", "Analog and Digital Electronics"): [("EC", "Analog Circuits"), ("EC", "Digital Circuits")],
    ("EC", "Control Systems"): [("EE", "Control Systems")],
    ("EE", "Control Systems"): [("EC", "Control Systems")],
    ("EC", "Electromagnetics"): [("EE", "Electromagnetic Fields")],
    ("EE", "Electromagnetic Fields"): [("EC", "Electromagnetics")],
    ("EE", "Signals and Systems"): [("EC", "Networks, Signals and Systems")],
    ("EE", "Electric Circuits"): [("EC", "Networks, Signals and Systems")],
    ("EC", "Networks, Signals and Systems"): [("EE", "Signals and Systems"), ("EE", "Electric Circuits")],
    ("DA", "Programming, Data Structures and Algorithms"): [("CS", "Programming and Data Structures"), ("CS", "Algorithms")],
    ("DA", "Database Management and Warehousing"): [("CS", "Databases")],
}


def normalize_text(text):
    text = re.sub(r"\[gate-source[^\n]*", "", text or "")
    text = re.sub(r"gate-media://\S+", "", text)
    return re.sub(r"\W+", "", text, flags=re.ASCII).lower()


def normalize_name(name):
    name = name.casefold().strip()
    if name in ("ordinary differential equations", "partial differential equations"):
        return "differential equations"
    return "calculus" if name == "calculus and optimization" else name


def eligible(q):
    return (q.get("status") == "PUBLISHED" and q.get("source_kind") == "PYQ"
            and q.get("grading_policy") != "MARKS_TO_ALL" and q.get("syllabus_note") is None
            and q.get("topic_id") is not None and q.get("marks") in (1, 2))


def allocate_quotas(weights, capacities, total, cover=True):
    """Largest remainder, minimum topic coverage, then capacity redistribution by weight."""
    keys = sorted(weights, key=lambda k: (-weights[k], k))
    if sum(capacities.values()) < total:
        raise ValueError("Section has too few available questions")
    denom = sum(weights.values()) or len(keys)
    ideal = {k: total * (weights[k] if sum(weights.values()) else 1) / denom for k in keys}
    quotas = {k: int(ideal[k]) for k in keys}
    for k in sorted(keys, key=lambda k: (-(ideal[k] - quotas[k]), -weights[k], k))[:total - sum(quotas.values())]:
        quotas[k] += 1
    minimum = {k: int(cover and capacities[k] >= 2) for k in keys}
    if sum(minimum.values()) > total:
        minimum = {k: int(k in [t for t in keys if capacities[t] >= 2][:total]) for k in keys}
    for k in keys:
        quotas[k] = min(capacities[k], max(minimum[k], quotas[k]))
    while sum(quotas.values()) > total:
        k = max((k for k in keys if quotas[k] > minimum[k]), key=lambda k: (quotas[k] - ideal[k], -weights[k], k))
        quotas[k] -= 1
    while sum(quotas.values()) < total:
        k = next(k for k in keys if quotas[k] < capacities[k])
        quotas[k] += 1
    return quotas


def select_section(pools, weights, one, two, rng, used, cover=True):
    """Min-cost matching enforces mark counts and unique text across overlapping topic pools.

    Topic edges prefer quota slots; first slots preserve coverage. Overflow goes to
    heavier topics. Residual edges allow an earlier draw to move when a pool is tight.
    """
    keys = sorted(pools, key=lambda k: (-weights[k], k))
    candidates = {}
    for k in keys:
        for q in sorted(pools[k], key=lambda q: q['id']):
            text = normalize_text(q['markdown_content'])
            if text not in used:
                candidates.setdefault(text, {}).setdefault(k, q)
    capacities = {k: sum(k in choices for choices in candidates.values()) for k in keys}
    quotas = allocate_quotas(weights, capacities, one + two, cover)
    graph = {}

    def edge(a, b, cap, cost):
        graph.setdefault(a, []); graph.setdefault(b, [])
        forward = [b, cap, cost, len(graph[b])]
        backward = [a, 0, -cost, len(graph[a])]
        graph[a].append(forward); graph[b].append(backward)
        return forward

    edge('s', ('mark', 1), one, 0); edge('s', ('mark', 2), two, 0)
    draws = list(candidates.items()); rng.shuffle(draws)
    chosen = []
    for i, (text, choices) in enumerate(draws):
        # A normalised duplicate is one question, even when source copies disagree on marks.
        canonical = min(choices.values(), key=lambda q: q['id'])
        edge(('mark', canonical['marks']), ('q', i), 1, 0)
        for k, q in choices.items():
            if q['marks'] == canonical['marks']:
                e = edge(('q', i), ('topic', k), 1, 0)
                chosen.append((e, q, k, text))
    for i, k in enumerate(keys):
        for n in range(capacities[k]):
            cost = -10000 if cover and n == 0 and capacities[k] >= 2 else (-100 if n < quotas[k] else i)
            edge(('topic', k), 't', 1, cost)
    for _ in range(one + two):
        dist = {'s': 0}; prev = {}; queue = deque(['s']); queued = {'s'}
        while queue:
            a = queue.popleft(); queued.remove(a)
            for j, (b, cap, cost, _) in enumerate(graph[a]):
                if cap and dist.get(b, float('inf')) > dist[a] + cost:
                    dist[b] = dist[a] + cost; prev[b] = (a, j)
                    if b not in queued:
                        queue.append(b); queued.add(b)
        if 't' not in prev:
            raise ValueError(f"Cannot fill section with {one} one-mark and {two} two-mark unique questions")
        b = 't'
        while b != 's':
            a, j = prev[b]; e = graph[a][j]
            e[1] -= 1; graph[b][e[3]][1] += 1; b = a
    result = []
    for e, q, k, text in chosen:
        if e[1] == 0:
            result.append({**q, 'target_topic': k}); used.add(text)
    return result


def build_paper(subject, mock, subjects, topics, questions):
    rng = random.Random(f"{subject}-{mock}")
    subject_ids = {s['id']: s['code'] for s in subjects}
    topic_by_id = {t['id']: t for t in topics}
    rows = [q for q in sorted(questions, key=lambda q: q['id']) if eligible(q) and q['topic_id'] in topic_by_id]
    # IDs as well as text must be unique, even with synthetic or malformed input.
    rows = list({q['id']: q for q in rows}.values())
    used = set()
    ga = [q for q in rows if q['section_kind'] == 'GA']
    selected = select_section({'GA': ga}, {'GA': 1}, 5, 5, rng, used)
    # Maths (FOUNDATION) and core are one 55-question section (25 one-mark + 30 two-mark), each topic weighted by the
    # marks it carried in this paper's own past exams. The maths share then follows the real paper: ~13 marks in CS,
    # EE or ME, but much more in DA, where probability, linear algebra and calculus are a large part of the exam.
    targets = [t for t in topics if subject_ids.get(t['subject_id']) == subject
               and t['section_kind'] in ('FOUNDATION', 'CORE') and t.get('is_active', True)]
    pools = {}; weights = {1: {}, 2: {}}
    for t in targets:
            kind = t['section_kind']
            key = t['id']; pools[key] = []
            # How many 1-mark and 2-mark questions this topic had in this paper's own past exams.
            for m in (1, 2):
                weights[m][key] = sum(1 for q in rows if q['topic_id'] == key and q['marks'] == m
                                      and subject_ids.get(q['subject_id']) == subject)
            for q in rows:
                if q['section_kind'] != kind:
                    continue
                source = topic_by_id[q['topic_id']]
                code = subject_ids.get(source['subject_id'])
                own = source['id'] == key
                if kind == 'FOUNDATION':
                    match = normalize_name(source['name']) == normalize_name(t['name'])
                    if t['name'] in ('Discrete Mathematics', 'Special Topics'):
                        match = match and code == subject
                else:
                    match = (code, source['name']) in CROSSOVER.get((subject, t['name']), [])
                if own or match:
                    pools[key].append(q)
    # One-mark and two-mark slots are allocated separately, each by that topic's own history, so a topic that is
    # mostly 2-mark in real papers (e.g. EE calculus) is not filled with 1-mark questions here.
    for m, count in ((2, 30), (1, 25)):
        band = {k: [q for q in pool if q['marks'] == m] for k, pool in pools.items()}
        selected += select_section(band, weights[m], count if m == 1 else 0, count if m == 2 else 0, rng, used, cover=False)
    ordered = []
    for ga_band in (True, False):
        for marks in (1, 2):
            band = [q for q in selected if (q['section_kind'] == 'GA') == ga_band and q['marks'] == marks]
            rng.shuffle(band); ordered.extend(band)
    assert len(ordered) == 65
    assert Counter(q['marks'] for q in ordered) == {1: 30, 2: 35}
    assert sum(q['marks'] for q in ordered) == 100
    assert len({q['id'] for q in ordered}) == len({normalize_text(q['markdown_content']) for q in ordered}) == 65
    return ordered


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--subject', choices=['AE', 'CE', 'CS', 'DA', 'EC', 'EE', 'ME'])
    group.add_argument('--all', action='store_true')
    parser.add_argument('--mock', type=int, required=True)
    parser.add_argument('--dry', action='store_true')
    args = parser.parse_args()
    if args.mock < 1:
        parser.error('--mock must be positive')
    # Lazy import keeps unit tests and --help completely offline and credential-free.
    from common import get, patch, HEADERS, URL
    import urllib.request

    def post(path, body):
        req = urllib.request.Request(f'{URL}/rest/v1/{path}', data=json.dumps(body).encode(), method='POST',
                                     headers={**HEADERS, 'Prefer': 'return=representation'})
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)

    # get() owns bounded paging (MAX_PAGES + repeated-page protection); never pass limit/offset.
    subjects = get('subjects?select=id,code,name&is_active=eq.true&order=id')
    topics = get('topics?select=id,subject_id,name,section_kind,is_active&order=id')
    bp = get(f'blueprint_profiles?select=id&name=eq.{quote(BLUEPRINT)}&order=id')
    if len(bp) != 1:
        raise ValueError('Expected one existing full-paper blueprint')
    questions = None
    for s in sorted(subjects, key=lambda s: s['code']):
        if not args.all and s['code'] != args.subject:
            continue
        title = f"GATE 2027 Ranked Mock {args.mock} · {s['name']}"
        if get(f'test_versions?select=id&title=eq.{quote(title)}&order=id'):
            print(f'skip: {title} already exists'); continue
        if questions is None:
            questions = get('question_versions?select=id,subject_id,topic_id,section_kind,marks,markdown_content,status,source_kind,grading_policy,syllabus_note'
                            '&status=eq.PUBLISHED&source_kind=eq.PYQ&or=(grading_policy.is.null,grading_policy.neq.MARKS_TO_ALL)'
                            '&syllabus_note=is.null&topic_id=not.is.null&order=id')
        paper = build_paper(s['code'], args.mock, subjects, topics, questions)
        print(f'{"plan" if args.dry else "create"}: {title}: 65 questions · 100 marks · 3 hours')
        names = {t['id']: t['name'] for t in topics}
        for tid in dict.fromkeys(q['target_topic'] for q in paper):
            qs = [q for q in paper if q['target_topic'] == tid]
            cross = sum(q['subject_id'] != s['id'] for q in qs)
            print(f"  {names.get(tid, tid)}: {len(qs)} questions, {sum(q['marks'] for q in qs)} marks, "
                  f"1-mark={sum(q['marks'] == 1 for q in qs)}, crossover={cross}/{len(qs)}")
        if args.dry:
            continue
        # Created hidden, filled, then switched on: a failure half-way never leaves an empty live test.
        tv = post('test_versions', dict(title=title, blueprint_profile_id=bp[0]['id'], kind='RANKED', access_tier='PAID',
                  is_demo=False, is_active=False, subject_id=s['id'], max_attempts_per_user=1,
                  available_from=datetime.now(timezone.utc).isoformat(),
                  description='65 random past GATE questions in the official pattern. You get one counted attempt, ranked against everyone who takes this test.'))[0]
        rows = post('test_version_questions', [dict(test_version_id=tv['id'], question_version_id=q['id'],
                    section='GA' if i < 10 else 'CORE', question_order=i + 1) for i, q in enumerate(paper)])
        if len(rows) != 65:
            raise RuntimeError(f"{title}: inserted {len(rows)} questions, expected 65; test left inactive ({tv['id']})")
        patch(f"test_versions?id=eq.{tv['id']}", {'is_active': True})
        print(f"  live: {tv['id']}")


if __name__ == '__main__':
    main()
