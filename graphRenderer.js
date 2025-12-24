function createNetwork(container, nodes, edges) {
  const data = {
    nodes: new vis.DataSet(nodes.map(n => ({
      id: n.id,
      label: n.label
    }))),
    edges: new vis.DataSet(edges.map(e => ({
      from: e.from,
      to: e.to,
      label: e.label
    })))
  };
  const options = {
    interaction: {
      hover: true
    },
    physics: {
      enabled: true,
      stabilization: {
        iterations: 200
      }
    },
    edges: {
      smooth: true
    },
    nodes: {
      shape: 'dot',
      size: 12
    }
  };
  const network = new vis.Network(container, data, options);
  return {
    network,
    data
  };
}

function toMap(nodes) {
  const m = new Map();
  for (const n of nodes) m.set(n.id, n);
  return m;
}

function highlightNeighbors(network, edges, nodeId) {
  const connected = new Set([nodeId]);
  for (const e of edges) {
    if (e.from === nodeId) connected.add(e.to);
    if (e.to === nodeId) connected.add(e.from);
  }
  const update = [];
  network.body.data.nodes.forEach(n => {
    update.push({
      id: n.id,
      color: connected.has(n.id) ? undefined : '#4b5563'
    });
  });
  network.body.data.nodes.update(update);
}

function resetColors(network) {
  const update = [];
  network.body.data.nodes.forEach(n => {
    update.push({
      id: n.id,
      color: undefined
    });
  });
  network.body.data.nodes.update(update);
}
window.GraphRenderer = {
  init: function(container, nodes, edges) {
    const graph = createNetwork(container, nodes, edges);
    const api = {
      fit: function() {
        graph.network.fit({
          animation: true
        });
      },
      setPhysics: function(on) {
        graph.network.setOptions({
          physics: {
            enabled: on
          }
        });
      },
      selectBy: function(query) {
        const q = query.trim().toLowerCase();
        if (!q) {
          graph.network.unselectAll();
          resetColors(graph.network);
          return;
        }
        const ids = [];
        for (const n of nodes) {
          const t = (n.label || '') + " " + (n.id || '');
          if (t.toLowerCase().includes(q)) ids.push(n.id);
        }
        if (ids.length) {
          graph.network.selectNodes(ids);
          highlightNeighbors(graph.network, edges, ids[0]);
        }
      }
    };
    graph.network.on('selectNode', params => {
      const nid = params.nodes[0];
      highlightNeighbors(graph.network, edges, nid);
    });
    graph.network.on('deselectNode', () => {
      resetColors(graph.network);
    });
    return api;
  }
};