export const stages = ["Created","Open","Started","Peer Review","QA Started","QA Issue","Resolved"];
const legacy:Record<string,string>={"To Do":"Open","In Progress":"Started","In Review":"Peer Review","Testing":"QA Started","Blocked":"QA Issue","Done":"Resolved"};
export const normalizeStatus=(s:string)=>legacy[s]||s;
export const nextStages:Record<string,string[]>={Created:["Open"],Open:["Started"],Started:["Peer Review"],"Peer Review":["Started","QA Started"],"QA Started":["QA Issue","Resolved"],"QA Issue":["Started"],Resolved:["Open"]};
export const validTransition=(from:string,to:string)=>normalizeStatus(from)===to||(nextStages[normalizeStatus(from)]||[]).includes(to);
