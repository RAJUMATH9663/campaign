from std.sys import argv
from std.time import perf_counter_ns

def clean_phone(raw: String) -> String:
    var res = String()
    for b in raw.bytes():
        if b == 43: # '+'
            if res.byte_length() == 0:
                res += "+"
        elif b >= 48 and b <= 57: # '0'-'9'
            res += chr(Int(b))
    return res

def normalize_e164(cleaned: String) -> String:
    var length = cleaned.byte_length()
    if length == 10:
        var first = cleaned.as_bytes()[0]
        if first >= 54 and first <= 57: # '6'-'9'
            return "+91" + cleaned
        return "+1" + cleaned
    elif length == 11 and cleaned.as_bytes()[0] == 48: # Starts with '0'
        var rest = String()
        var i = 0
        for b in cleaned.bytes():
            if i > 0:
                rest += chr(Int(b))
            i += 1
        return "+91" + rest
    elif length >= 11 and length <= 16 and cleaned.as_bytes()[0] == 43: # Already has '+'
        return cleaned
    return cleaned

def is_valid_phone(phone: String) -> Bool:
    var length = phone.byte_length()
    if length < 11 or length > 16:
        return False
    if phone.as_bytes()[0] != 43:
        return False
    var i = 0
    for b in phone.bytes():
        if i > 0 and (b < 48 or b > 57):
            return False
        i += 1
    return True

def split_lines(text: String) -> List[String]:
    var lines = List[String]()
    var cur = String()
    for b in text.bytes():
        if b == 10: # '\n'
            lines.append(cur)
            cur = String()
        elif b != 13: # skip '\r'
            cur += chr(Int(b))
    if cur.byte_length() > 0:
        lines.append(cur)
    return lines^

def split_csv_row(row: String) -> List[String]:
    var cols = List[String]()
    var cur = String()
    for b in row.bytes():
        if b == 44: # ','
            cols.append(cur)
            cur = String()
        elif b != 34: # skip quotes '"'
            cur += chr(Int(b))
    cols.append(cur)
    return cols^

def escape_json(s: String) -> String:
    var out = String()
    for b in s.bytes():
        if b == 34: # '"'
            out += "\\\""
        elif b == 92: # '\'
            out += "\\\\"
        else:
            out += chr(Int(b))
    return out

def main() raises:
    var start_time = perf_counter_ns()
    var args = argv()
    var filepath = String("/mnt/c/Users/user/Downloads/campaign-manager/mojo-engine/sample.txt")
    if len(args) > 1:
        filepath = String(args[1])

    var f = open(filepath, "r")
    var content = f.read()
    f.close()

    var lines = split_lines(content)
    var total_rows = 0
    var valid_count = 0
    var invalid_count = 0
    var duplicate_count = 0

    var seen_phones = List[String]()
    var json_rows = List[String]()

    var name_idx = 0
    var phone_idx = 1
    var email_idx = 2
    var start_row = 0

    if len(lines) > 0:
        var header_cols = split_csv_row(lines[0])
        var is_header = False
        for i in range(len(header_cols)):
            var col_lower = header_cols[i].lower()
            if "phone" in col_lower or "mobile" in col_lower or "number" in col_lower:
                phone_idx = i
                is_header = True
            elif "name" in col_lower:
                name_idx = i
                is_header = True
            elif "email" in col_lower:
                email_idx = i
                is_header = True
        if is_header:
            start_row = 1

    for r in range(start_row, len(lines)):
        var line = lines[r]
        if line.byte_length() == 0:
            continue

        total_rows += 1
        var cols = split_csv_row(line)
        var name = String("Unnamed")
        var raw_phone = String()
        var email = String()

        if name_idx < len(cols):
            name = String(cols[name_idx].strip())
        if phone_idx < len(cols):
            raw_phone = String(cols[phone_idx].strip())
        if email_idx < len(cols):
            email = String(cols[email_idx].strip())

        var cleaned = clean_phone(raw_phone)
        var normalized = normalize_e164(cleaned)
        var valid = is_valid_phone(normalized)
        var is_duplicate = False

        if valid:
            for s in seen_phones:
                if s == normalized:
                    is_duplicate = True
                    break
            if is_duplicate:
                duplicate_count += 1
            else:
                seen_phones.append(normalized)
                valid_count += 1
        else:
            invalid_count += 1

        var error_msg = String()
        if not valid:
            error_msg = "Invalid phone format (must be 10-15 digits)"
        elif is_duplicate:
            error_msg = "Duplicate phone number in CSV file"

        var row_json = "{" + \
            "\"name\":\"" + escape_json(name) + "\"," + \
            "\"rawPhone\":\"" + escape_json(raw_phone) + "\"," + \
            "\"normalizedPhone\":\"" + escape_json(normalized) + "\"," + \
            "\"email\":\"" + escape_json(email) + "\"," + \
            "\"isValid\":" + ("true" if valid and not is_duplicate else "false") + "," + \
            "\"isDuplicate\":" + ("true" if is_duplicate else "false") + "," + \
            "\"error\":\"" + escape_json(error_msg) + "\"" + \
            "}"
        json_rows.append(row_json)

    var end_time = perf_counter_ns()
    var elapsed_us = Float64(end_time - start_time) / 1000.0

    print("{")
    print("  \"engine\": \"Mojo 1.0 (Hardware-Accelerated)\",")
    print("  \"totalRows\": " + String(total_rows) + ",")
    print("  \"validCount\": " + String(valid_count) + ",")
    print("  \"invalidCount\": " + String(invalid_count) + ",")
    print("  \"duplicateCount\": " + String(duplicate_count) + ",")
    print("  \"elapsedMicroseconds\": " + String(elapsed_us) + ",")
    print("  \"rows\": [")
    for i in range(len(json_rows)):
        var comma = "," if i < len(json_rows) - 1 else ""
        print("    " + json_rows[i] + comma)
    print("  ]")
    print("}")
