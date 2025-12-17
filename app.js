let current={nodes:[],edges:[],graph:null};
function $(id){return document.getElementById(id)}
function setStatus(text){$('status').textContent=text}
function setCounts(nodes,edges){$('counts').textContent=nodes.length+' nodes, '+edges.length+' edges'}
function setWarnings(list){
  if(!list||!list.length){$('warnings').textContent=''}
  else{$('warnings').textContent='Warnings: '+list.join('; ')}
}
function renderTable(el,rows){
  if(!rows||!rows.length){el.innerHTML='<thead><tr><th>Empty</th></tr></thead>';
    el.innerHTML+='<tbody></tbody>';return}
  const cols=Object.keys(rows[0]).filter(k=>k!=='attrs');
  const thead='<thead><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead>';
  let body='<tbody>';
  for(const r of rows){
    const vals=cols.map(c=>{
      const v=r[c];return '<td>'+(v===undefined?'':String(v))+'</td>'
    }).join('');
    body+='<tr>'+vals+'</tr>'
  }
  body+='</tbody>';
  el.innerHTML=thead+body
}
function activateTab(name){
  for(const b of document.querySelectorAll('.tab')){
    b.classList.toggle('active',b.dataset.tab===name)
  }
  for(const p of document.querySelectorAll('.panel')){
    p.classList.toggle('active',p.id===name)
  }
}
function initTabs(){
  for(const b of document.querySelectorAll('.tab')){
    b.addEventListener('click',()=>activateTab(b.dataset.tab))
  }
}
function loadText(text,sourceName){
  const res=GDFParser.parseGDF(text);
  current.nodes=res.nodes;current.edges=res.edges;
  setStatus(sourceName+' loaded');
  setCounts(current.nodes,current.edges);
  setWarnings(res.warnings);
  renderTable($('nodesTable'),current.nodes);
  renderTable($('edgesTable'),current.edges);
  const container=$('graphContainer');
  current.graph=GraphRenderer.init(container,current.nodes,current.edges);
  if((current.nodes.length+current.edges.length)>10000){current.graph.setPhysics(false);$('physicsToggle').checked=false}
}
function decodeUTF8(buf){
  return new TextDecoder('utf-8').decode(buf)
}
function isGzip(buf){
  const u=new Uint8Array(buf);return u.length>2&&u[0]===0x1f&&u[1]===0x8b
}
function loadFile(f){
  const r=new FileReader();
  r.onload=()=>{
    const buf=r.result;
    if(isGzip(buf)||/\.gz$/i.test(f.name)){
      try{
        const decompressed=pako.ungzip(new Uint8Array(buf));
        const text=decodeUTF8(decompressed);
        loadText(text,f.name.replace(/\.gz$/i,''));
        return
      }catch(e){
        setWarnings(['Failed to decompress gzip'])
      }
    }
    const text=decodeUTF8(buf);
    loadText(text,f.name)
  };
  r.readAsArrayBuffer(f)
}
function initUpload(){
  const input=$('fileInput');
  input.addEventListener('change',()=>{const f=input.files[0];if(!f)return;loadFile(f)});
  const dz=$('dropZone');
  function prevent(e){e.preventDefault();e.stopPropagation()}
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{prevent(e);dz.classList.add('active')}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{prevent(e);dz.classList.remove('active')}));
  dz.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(!f)return;loadFile(f)})
}
function initControls(){
  $('fitBtn').addEventListener('click',()=>{if(current.graph)current.graph.fit()});
  $('physicsToggle').addEventListener('change',e=>{if(current.graph)current.graph.setPhysics(e.target.checked)});
  $('searchBtn').addEventListener('click',()=>{const q=$('searchInput').value;if(current.graph)current.graph.selectBy(q)});
  $('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter'){const q=$('searchInput').value;if(current.graph)current.graph.selectBy(q)}})
}
function boot(){
  initTabs();initUpload();initControls();
}
document.addEventListener('DOMContentLoaded',boot)