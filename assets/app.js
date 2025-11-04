// assets/app.js
import { h, render } from "https://esm.sh/preact@10.24.3";
import { useState, useEffect, useMemo } from "https://esm.sh/preact@10.24.3/hooks";
import htm from "https://esm.sh/htm@3.1.1";
const html = htm.bind(h);

const VIEW_ONLY = new URLSearchParams(location.search).get("view") === "1";
const ROOT_KEY = "ca-ne-root-v1";
const BOARD_PREFIX = "ca-ne-board-";

const defaultTop = [0,1,2,3,4,5,6,7,8,9];
const defaultSide = [0,1,2,3,4,5,6,7,8,9];
const emptySquares = () => Array.from({length:100},()=>({owner:"",email:"",paid:false,note:""}));
const rcToIdx=(r,c)=>r*10+c;
const idxToRC=(i)=>({row:Math.floor(i/10),col:i%10});
const shuffle10=()=>{const a=[0,1,2,3,4,5,6,7,8,9];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const ones=n=>Math.abs(parseInt(n||0,10))%10;

const venmoLink=(hndl,amt,note)=>{
  if(!hndl) return "#";
  const params=new URLSearchParams({txn:"pay",amount:String(amt||""),note:note||""});
  const clean=hndl.startsWith("@")?hndl.slice(1):hndl;
  return `https://venmo.com/${clean}?${params}`;
};

const hash=async t=>{
  const e=new TextEncoder().encode(t);
  const b=await crypto.subtle.digest("SHA-256",e);
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
};

function defaultBoard(name="Board"){
  return {
    teamTop:"Home Team",
    teamSide:"Away Team",
    topNums:defaultTop,
    sideNums:defaultSide,
    numbersLocked:false,
    squares:emptySquares(),
    costPerSquare:10,
    payoutMode:"percent",
    payouts:{q1:25,q2:25,q3:25,q4:25},
    venmoHandle:"@NoreastersFlagFB",
    boardTitle:name,
    themeColor:"#1e3a8a",
    adminHash:"",
    scores:{q1:{top:"",side:""},q2:{top:"",side:""},q3:{top:"",side:""},q4:{top:"",side:""}}
  };
}

function useRoot(){
  const [boards,setBoards]=useState([]),[activeId,setActiveId]=useState(null);
  useEffect(()=>{
    const raw=localStorage.getItem(ROOT_KEY);
    if(raw){
      const j=JSON.parse(raw);setBoards(j.boards||[]);setActiveId(j.activeId||(j.boards?.[0]?.id));
    }else{
      const id=Date.now()+"";const seed=defaultBoard("Default Board");
      localStorage.setItem(BOARD_PREFIX+id,JSON.stringify(seed));
      const j={boards:[{id,name:"Default Board"}],activeId:id};
      localStorage.setItem(ROOT_KEY,JSON.stringify(j));setBoards(j.boards);setActiveId(id);
    }
  },[]);
  useEffect(()=>localStorage.setItem(ROOT_KEY,JSON.stringify({boards,activeId})),[boards,activeId]);
  const createBoard=n=>{const id=Date.now()+"";localStorage.setItem(BOARD_PREFIX+id,JSON.stringify(defaultBoard(n)));setBoards(b=>[...b,{id,name:n}]);setActiveId(id);}
  const deleteBoard=id=>{if(!confirm("Delete this board?"))return;localStorage.removeItem(BOARD_PREFIX+id);setBoards(b=>b.filter(x=>x.id!==id));if(activeId===id)setActiveId(boards.find(b=>b.id!==id)?.id??null);}
  return{boards,activeId,setActiveId,createBoard,deleteBoard};
}

function useBoard(id){
  const[d,setD]=useState(null);
  useEffect(()=>{if(!id)return;const r=localStorage.getItem(BOARD_PREFIX+id);if(r)setD(JSON.parse(r));},[id]);
  useEffect(()=>{if(!id||!d)return;localStorage.setItem(BOARD_PREFIX+id,JSON.stringify(d));if(d.themeColor)document.documentElement.style.setProperty("--brand",d.themeColor);},[id,d]);
  return[d,setD];
}
function Setup({root,board,setBoard}){
  if(!board)return html`<div>Loading…</div>`;
  const sold=board.squares.filter(s=>s.owner).length,pot=sold*board.costPerSquare;
  const set=(k,v)=>setBoard({...board,[k]:v});

  return html`
  <div class="toolbar">
    <img src="./assets/logo-wordmark.png" alt="Wordmark"
         onError=${e=>e.target.style.display="none"} style="height:28px"/>
    <span class="pill">${sold}/100 sold</span>
    <span class="pill">Pot: $${pot}</span>
    <span class="pill">${board.boardTitle}</span>
  </div>

  <div class="section-title">Boards</div>
  <div class="row">
    <div>
      <label>Active Board</label>
      <select value=${root.activeId||""} onChange=${e=>root.setActiveId(e.target.value)}>
        ${root.boards.map(b=>html`<option value=${b.id}>${b.name}</option>`)}
      </select>
    </div>
    <div>
      <label>New Board</label>
      <input id="newBoardName" placeholder="e.g. Week 3"/>
      <button onClick=${()=>{const el=document.getElementById("newBoardName");if(el.value)root.createBoard(el.value);}}>Create</button>
    </div>
    <div>
      <label>Read-only Link</label>
      <input readonly
        value=${location.origin+location.pathname+"?view=1"}
        onFocus=${e=>e.target.select()}
        onClick=${e=>e.target.select()} />
    </div>
  </div>

  <hr/>
  <div class="section-title">Setup</div>
  <div class="row">
    <div><label>Board Title</label><input value=${board.boardTitle} onInput=${e=>set("boardTitle",e.target.value)}/></div>
    <div><label>Venmo Handle</label><input value=${board.venmoHandle} onInput=${e=>set("venmoHandle",e.target.value)}/></div>
    <div><label>Cost per Square</label><input type="number" value=${board.costPerSquare} onInput=${e=>set("costPerSquare",parseFloat(e.target.value)||0)}/></div>
  </div>`;
}

function Root(){
  const root=useRoot();const[board,setBoard]=useBoard(root.activeId);
  if(!root.activeId||!board)return html`<div>Loading…</div>`;
  return html`<div class="container"><${Setup} root=${root} board=${board} setBoard=${setBoard}/></div>`;
}

render(html`<${Root}/>`,document.body);
