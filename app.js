document.addEventListener('DOMContentLoaded',()=>{
const root=document.body;
const dash=document.createElement('main');
dash.innerHTML=`<div class="grid">
<div class="card"><h3>Collection</h3><p>0 Paints</p></div>
<div class="card"><h3>Favorites</h3><p>0</p></div>
<div class="card"><h3>Inventory</h3><p>No alerts</p></div>
<div class="card"><h3>Quick Actions</h3><button>Add Paint</button></div>
</div>`;
root.appendChild(dash);
});