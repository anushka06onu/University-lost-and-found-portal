const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function boot() {
 const elements=new Map(), data=new Map();
 const element=id=>{if(!elements.has(id)) elements.set(id,{value:'',textContent:'',innerHTML:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},listeners:{},addEventListener(type,fn){this.listeners[type]=fn},setAttribute(){},scrollIntoView(){}});return elements.get(id)};
 const context={console,setTimeout,clearTimeout,AbortController,Response,fetch:async()=>{throw new Error('offline')},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){},body:element('body')},alert(){}};
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/main/resources/static/script.js'),'utf8'),context);
 return {context,element,data};
}
test('failed backend login cannot create a demo or administrator session',async()=>{
 const {context,element,data}=boot();element('loginEmail').value='test@example.com';element('loginPassword').value='password123';
 await element('loginForm').listeners.submit({preventDefault(){}});
 assert.equal(vm.runInContext('authToken',context),'');assert.equal(data.has('lf_token'),false);assert.match(element('loginMessage').textContent,/unavailable/);
});
test('failed record fetch shows unavailable instead of invented reports',async()=>{
 const {context,element}=boot();await vm.runInContext('loadItems("")',context);
 assert.match(element('itemsContainer').innerHTML,/unavailable/);assert.doesNotMatch(element('itemsContainer').innerHTML,/iPhone|John Doe/);
});
test('the old demo OTP cannot bypass server verification',async()=>{
 const {element}=boot();element('verifyEmail').value='student@diu.edu.bd';element('verifyOtp').value='123456';
 await element('verifyForm').listeners.submit({preventDefault(){}});assert.equal(element('verifyMessage').textContent,'Verify failed.');
});
