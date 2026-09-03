"""
test_genre_safety.py

Automated test for the genre-safety guardrail, same spirit as
test_grader.py's smoke test. Unlike the grader, this needs zero
network access - genre_safety.py has no external dependencies, so this
test can (and should) be run standalone before touching anything that
needs API keys.

Monkeypatches GENRE_RESTRICTIONS in memory only (never edits the
source file) so the real app's actual behavior - Biology unrestricted
- is never at risk from running this test.

Run from backend/ with the venv active:
    python test_genre_safety.py
"""
import sys

from agents import genre_safety


def main():
    failures = []

    original_restrictions = dict(genre_safety.GENRE_RESTRICTIONS)
    print(f"Original GENRE_RESTRICTIONS (should be empty in the real app): {original_restrictions}")

    try:
        # Monkeypatch in memory only - this reassigns the module's
        # global binding, which is what is_genre_allowed()/
        # get_allowed_genres() read at call time (they look up
        # GENRE_RESTRICTIONS in their own module's namespace, not a
        # copy), so this actually changes their behavior for the
        # duration of this test without touching the file on disk.
        genre_safety.GENRE_RESTRICTIONS = {"Biology": ["survival_horror"]}
        print(f"Monkeypatched GENRE_RESTRICTIONS to: {genre_safety.GENRE_RESTRICTIONS}")

        print("\n--- Test 1: blocked combination ---")
        result_blocked = genre_safety.is_genre_allowed("Biology", "sitcom")
        print(f"is_genre_allowed('Biology', 'sitcom') = {result_blocked}")
        if result_blocked is not False:
            msg = f"FAIL: expected False, got {result_blocked}"
            print(msg)
            failures.append(msg)
        else:
            print("PASS: sitcom correctly blocked for Biology under the temporary restriction.")

        print("\n--- Test 2: allowed combination ---")
        result_allowed = genre_safety.is_genre_allowed("Biology", "survival_horror")
        print(f"is_genre_allowed('Biology', 'survival_horror') = {result_allowed}")
        if result_allowed is not True:
            msg = f"FAIL: expected True, got {result_allowed}"
            print(msg)
            failures.append(msg)
        else:
            print("PASS: survival_horror correctly allowed for Biology under the temporary restriction.")

    finally:
        # Restore in-memory state regardless of pass/fail above, so a
        # failed assertion can't leave the module in a bad state for
        # anything importing it afterward in the same process.
        genre_safety.GENRE_RESTRICTIONS = original_restrictions
        print(f"\nRestored in-memory GENRE_RESTRICTIONS to: {genre_safety.GENRE_RESTRICTIONS}")

    print("\n--- Test 3: confirm the SOURCE FILE was never touched ---")
    with open(genre_safety.__file__, "r") as f:
        source = f.read()

    # The real app's file should still show an empty dict - if this
    # test had edited the file instead of monkeypatching, this check
    # would catch it.
    if "GENRE_RESTRICTIONS = {\n    # " in source and "\"Biology\": [\"survival_horror\"]" not in source.split("GENRE_RESTRICTIONS = {")[1].split("}")[0]:
        print("PASS: genre_safety.py on disk still shows an empty GENRE_RESTRICTIONS - Biology is NOT restricted in the real app.")
    else:
        msg = "FAIL: genre_safety.py on disk appears to have been modified - check the file manually."
        print(msg)
        failures.append(msg)

    print("\n" + "=" * 60)
    if failures:
        print(f"{len(failures)} FAILURE(S):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("ALL CHECKS PASSED.")
    print("=" * 60)


if __name__ == "__main__":
    main()
