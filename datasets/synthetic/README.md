# Operation Glasshouse

Entirely fictional, authored for SPECTRE. All identities and GUIDs are synthetic. IP addresses use documentation ranges and DNS uses `.invalid`. No external connection is performed. The encoded string is a harmless illustrative command; the application never executes it.

`glasshouse.jsonl` contains 14 flat Sysmon-style and Windows Security-style exported records. It is **not an EVTX file**. `ground_truth.json` is kept separate from the parser and frontend. Expected output: six distinct processes (including PID reuse), four investigative rule matches, and unresolved explorer ancestry.

Initialization ingests this artifact into a reserved public synthetic account. The public API cannot select private cases. Signed-in analysts can import a fresh copy through **Import demo case**. Each repeat creates a separate investigation and passes through original storage, streaming hashing, subprocess parsing, normalization, relationship derivation and rule evaluation. To start over, import another copy; existing custody records are preserved.
