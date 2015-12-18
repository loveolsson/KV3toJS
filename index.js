exports.parse = function(file)
{
    file = file.replace(/\r\n/g, '\n'); //Change Windows style "\r\n" line breaks to UNIX style "\n"
    file = stripComments(file);

    var state = { pos: 0, file };
    return getValue(state);

}

function parseObject(file) {
    var state = {pos: 0, file};
    var output = {};
    var isname = true; //Are we looking for a variable name or value

    while (state.pos < state.file.length) {
        if (isname) {
            var name = getName(state);
            if (!name) break;
            isname = false;
        } else {
            var value = getValue(state);
            if (value !== null) {
                output[name] = value;
            } else {
                break;
            }
            isname = true;
        }
        state.pos ++;
    }

    return output;
}

function parseArray(file) {
    var output = [];
    var state = {pos: 0, file};

    while (state.pos < file.length) {

        var value = getValue(state);
        if (value !== null) {
            output.push(value);
        } else {
            break;
        }

        state.pos ++;
    }

    return output;
}

function stripComments(file) {
    file = file.replace(/<!--[\s\S]*?-->/g, ""); //Remove HTML-style comments
    file = file.replace(/\/\/[\s\S]*?\n/g, "");  //Remove single line comments
    return file.replace(/\/\*[\s\S]*?\*\//g, ""); //Remove multiline comments /* böö */
}

function findMatchingBracket(state) { //Find matching bracket for bracket at current position
    var pos = state.pos + 1;

    var start = state.file.charAt(state.pos);
    var find = (start == '[') ? ']':'}';

    var count = 1;
    var isstring = false; //If pointer is in string
    var multiline = false; //If string is multiline

    while (true) {
        var char = state.file.charAt(pos);
        switch (char) {
            case start:
                if (!isstring) count++;
                break;
            case find:
                if (!isstring) count--;

                if (count == 0) return pos;
                break;
            case '"':
                if (state.file.substring(pos, pos + 3) == '"""') {
                    multiline = !multiline;
                    isstring = !isstring;
                    pos += 2;
                } else if (!multiline) {
                    isstring = !isstring;
                }

                break;
            default:

        }

        pos++;
        if (pos >= state.file.length) {
            return 'eof';
        }
    }
}

function getValue(state) {
    var value = null;
    while (state.pos < state.file.length) {
        var char = state.file.charAt(state.pos);
        if (char == '{') {
            var end = findMatchingBracket(state);
            value = parseObject(state.file.substring(state.pos + 1, end));
            state.pos = end;
            break;
        } else if (char == '[') {
            var end = findMatchingBracket(state);
            value = parseArray(state.file.substring(state.pos + 1, end));
            state.pos = end;
            break;
        } else if (char == '"') {
            value = getString(state);
            break;
        } else if (state.file.substring(state.pos, state.pos + 4).toLowerCase() == 'true') {
            state.pos += 4;
            value = true;
            break;
        } else if (state.file.substring(state.pos, state.pos + 5).toLowerCase() == 'false') {
            state.pos += 5;
            value = false;
            break;
        } else if (state.file.substring(state.pos, state.pos + 8).toLowerCase() == 'resource') {
            state.pos += 9;
            value = { type: 'resource', value: getString(state) };
            break;
        } else if (/[-]|[0-9]/.test(char)) {
            value = getNumber(state);
            break;
        }
        state.pos++;
    }

    return value;
}

function getName(state) {
    var startpos = state.pos;
    while (state.file.charAt(state.pos) != '=') {
        state.pos ++;
        if (state.pos > state.file.length) {
            return false;
        }
    }

    return state.file.substring(startpos, state.pos).trim();

}

function getString (state) {
    var multiline = false;
    var start = state.file.indexOf('"', state.pos);
    if (state.file.substring(start, start + 3) == '"""') {
        multiline = true;
        start = state.file.indexOf('\n', start);
    }

    start++;

    if (multiline) {
        var end = state.file.indexOf('\n"""', start);
        if (end == -1) return null;
        state.pos = end + 3;
    } else {
        var end = start;
        while (true) {
            end = state.file.indexOf('"', end + 1);
            if (end == -1) return null;
            if (state.file.charAt(end - 1) != '\\') break;
        }
        state.pos = end;

    }

    return state.file.substring(start, end);
}

function getNumber(state) { 
    var startpos = state.pos;
    var isfloat;
    while (true) {
        if (!/[-]|[0-9]/.test(state.file.charAt(state.pos))) {
            if (state.file.charAt(state.pos) == '.') {
                isfloat = true;
            } else {
                break;
            }
        }
        state.pos++;
    }

    if (isfloat) {
        return parseFloat(state.file.substring(startpos, state.pos));
    } else {
        return parseInt(state.file.substring(startpos, state.pos));
    }
}
