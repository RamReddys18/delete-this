function parseDelimitedLine(line, delim) {
  const out = [];
  let i = 0;
  let cur = "";
  let inQ = false;
  while (i < line.length) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQ = true;
      } else if (c === delim) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    i++;
  }
  out.push(cur.trim());
  return out;
}

function normalizeType(t) {
  const s = t.trim().toUpperCase();
  if (s.includes('INT')) return 'int';
  if (s.includes('DOUBLE') || s.includes('FLOAT')) return 'float';
  if (s.includes('BOOL')) return 'bool';
  return 'string';
}

function coerce(val, type) {
  if (val === undefined || val === null || val === '') return undefined;
  if (type === 'int') {
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
  }
  if (type === 'float') {
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  }
  if (type === 'bool') {
    const v = val.trim().toLowerCase();
    return v === 'true' || v === '1';
  }
  return String(val);
}

function detectDelim(header) {
  if (header.includes(';')) return ';';
  if (header.includes('\t')) return '\t';
  return ',';
}

function parseHeader(line, prefix) {
  const def = line.slice(prefix.length).trim();
  const delim = detectDelim(def);
  const cols = parseDelimitedLine(def, delim).map(s => {
    const parts = s.trim().split(/\s+/);
    const name = parts[0];
    const type = normalizeType(parts[1] || 'string');
    return {
      name,
      type
    };
  });
  return {
    cols,
    delim
  };
}

function stripBOM(s) {
  if (s.charCodeAt(0) === 0xFEFF) return s.slice(1);
  return s;
}

function parseGDF(text) {
  const warnings = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return {
    nodes: [],
    edges: [],
    warnings: ["Empty file"]
  };
  lines[0] = stripBOM(lines[0]);
  let i = 0;
  let nodeDef = null;
  let edgeDef = null;
  const nodes = [];
  const edges = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.toLowerCase().startsWith('nodedef>')) {
      nodeDef = parseHeader(line, 'nodedef>');
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (l.toLowerCase().startsWith('edgedef>') || l.toLowerCase().startsWith('nodedef>')) break;
        const vals = parseDelimitedLine(l, nodeDef.delim);
        const obj = {};
        for (let k = 0; k < nodeDef.cols.length; k++) {
          const col = nodeDef.cols[k];
          obj[col.name] = coerce(vals[k], col.type);
        }
        let id = obj.name || obj.id || obj.label;
        if (id === undefined) {
          warnings.push('Node without id at line ' + (i + 1));
        } else {
          const label = obj.label !== undefined ? String(obj.label) : String(id);
          const attrs = {};
          for (const c of nodeDef.cols) {
            if (c.name !== 'name' && c.name !== 'id' && c.name !== 'label') {
              attrs[c.name] = obj[c.name];
            }
          }
          nodes.push({
            id: String(id),
            label,
            attrs
          });
        }
        i++;
      }
      continue;
    }
    if (line.toLowerCase().startsWith('edgedef>')) {
      edgeDef = parseHeader(line, 'edgedef>');
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (l.toLowerCase().startsWith('nodedef>') || l.toLowerCase().startsWith('edgedef>')) break;
        const vals = parseDelimitedLine(l, edgeDef.delim);
        const obj = {};
        for (let k = 0; k < edgeDef.cols.length; k++) {
          const col = edgeDef.cols[k];
          obj[col.name] = coerce(vals[k], col.type);
        }
        const from = obj.node1 || obj.source || obj.from;
        const to = obj.node2 || obj.target || obj.to;
        if (from === undefined || to === undefined) {
          warnings.push('Edge missing endpoints at line ' + (i + 1));
        } else {
          const w = obj.weight !== undefined ? obj.weight : undefined;
          const attrs = {};
          for (const c of edgeDef.cols) {
            if (!['node1', 'node2', 'source', 'target', 'from', 'to', 'weight', 'label'].includes(c.name)) {
              attrs[c.name] = obj[c.name];
            }
          }
          const label = obj.label !== undefined ? String(obj.label) : (w !== undefined ? String(w) : undefined);
          edges.push({
            from: String(from),
            to: String(to),
            label,
            weight: w,
            attrs
          });
        }
        i++;
      }
      continue;
    }
    i++;
  }
  if (nodes.length === 0 && edges.length === 0) {
    // Fallback: infer edges-only file by detecting delimiter and reading first two columns
    const sample = lines.slice(0, 200);
    const score = (d) => sample.reduce((acc, l) => acc + (l.includes('nodedef') || l.includes('edgedef') ? 0 : (l.split(d).length - 1)), 0);
    const delim = [',', ';', '\t'].sort((a, b) => score(b) - score(a))[0];
    const inferredEdges = [];
    const nodeSet = new Set();
    for (const l of lines) {
      const low = l.toLowerCase();
      if (low.startsWith('nodedef>') || low.startsWith('edgedef>')) continue;
      const vals = parseDelimitedLine(l, delim);
      if (vals.length < 2) continue;
      const from = vals[0];
      const to = vals[1];
      if (from !== undefined && to !== undefined) {
        nodeSet.add(String(from));
        nodeSet.add(String(to));
        const w = vals.length > 2 ? coerce(vals[2], 'float') : undefined;
        inferredEdges.push({
          from: String(from),
          to: String(to),
          label: w !== undefined ? String(w) : undefined,
          weight: w,
          attrs: {}
        });
      }
    }
    if (inferredEdges.length > 0) {
      const inferredNodes = Array.from(nodeSet).map(id => ({
        id: String(id),
        label: String(id),
        attrs: {}
      }));
      warnings.push('No headers found; inferred graph from edge pairs using delimiter "' + (delim === "\t" ? "TAB" : delim) + '".');
      return {
        nodes: inferredNodes,
        edges: inferredEdges,
        warnings
      };
    }
    warnings.push('No nodedef>/edgedef> sections found or wrong delimiter (comma/semicolon/tab).');
  }
  return {
    nodes,
    edges,
    warnings
  };
}
window.GDFParser = {
  parseGDF
};