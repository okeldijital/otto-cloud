import json
import os
import sys
import shutil
import mimetypes
from datetime import datetime
from database import SessionLocal
from models.release import Release
from models.track import Track
from models.contract import Contract, ContractAsset, ContractParty
from models.works_admin import WorksAdmin
from models.work import Work
from models.artist import Artist
from models.user import User
from services.status_quo import compute_release_status

# Ensure the script is run from the backend directory or with PYTHONPATH set
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def fetch_data():
    db = SessionLocal()
    
    # Raw Data Fetching
    # Exclude "Hub Smoke" and "Ghost" test data from titles/names
    def is_ghost(text):
        if not text: return False
        t = text.lower()
        return "ghost" in t or "hub smoke" in t

    releases_raw = [r for r in db.query(Release).all() if r.title and not is_ghost(r.title)]
    tracks_raw = [t for t in db.query(Track).all() if t.title and not is_ghost(t.title)]
    contracts_raw = [c for c in db.query(Contract).all() if c.title and not is_ghost(c.title)]
    works_raw = [w for w in db.query(Work).all() if w.title and not is_ghost(w.title) and not w.is_deleted]
    artists_raw = [a for a in db.query(Artist).all() if a.name and not is_ghost(a.name)]
    
    contract_assets = db.query(ContractAsset).all()
    contract_parties = db.query(ContractParty).all()
    users_raw = db.query(User).all()
    
    # Mapping
    artist_name_map = {a.id: a.name for a in artists_raw}
    user_map = {u.id: u.full_name for u in users_raw}
    
    # Prepare Asset directory
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    assets_dir = os.path.join(base_dir, "report", "assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    from config import settings
    storage_root = settings.STORAGE_ROOT

    def copy_asset(url):
        if not url or url.startswith('http'):
            return url
        filename = os.path.basename(url)
        src = os.path.join(storage_root, filename)
        if os.path.exists(src):
            dst = os.path.join(assets_dir, filename)
            try:
                shutil.copy2(src, dst)
                return f"assets/{filename}"
            except:
                return None
        return None

    # Processed Data Store
    data = {
        "stats": {
            "total_releases": len(releases_raw),
            "total_tracks": len(tracks_raw),
            "total_contracts": len(contracts_raw),
            "total_works": len(works_raw),
        },
        "red_flags": {
            "contracts_no_assets": [],
            "tracks_no_contract": [],
            "tracks_no_work": [],
            "releases_no_contract": []
        },
        "releases": [],
        "contracts": [],
        "artists": [],
        "tracks": []
    }
    
    # Pre-compute lookups
    contract_assets_by_type = {}
    for a in contract_assets:
        key = (a.asset_type, a.asset_id)
        if key not in contract_assets_by_type:
            contract_assets_by_type[key] = []
        contract_assets_by_type[key].append(a.contract_id)
        
    contract_parties_by_entity = {}
    for p in contract_parties:
        key = (p.entity_type, p.entity_id)
        if key not in contract_parties_by_entity:
            contract_parties_by_entity[key] = []
        contract_parties_by_entity[key].append(p.contract_id)
        
    tracks_by_release = {}
    for t in tracks_raw:
        if t.release_id not in tracks_by_release:
            tracks_by_release[t.release_id] = []
        tracks_by_release[t.release_id].append(t)
        
    # Process Contracts
    for c in contracts_raw:
        contract_dict = {
            "id": c.id,
            "title": c.title,
            "status": c.status,
            "type": c.type,
            "parties": []
        }
        
        c_assets = [a for a in contract_assets if a.contract_id == c.id]
        if not c_assets and c.status == 'Active':
            data["red_flags"]["contracts_no_assets"].append({"id": c.id, "title": c.title, "type": c.type})
            
        c_parties = [p for p in contract_parties if p.contract_id == c.id]
        for p in c_parties:
            name = p.external_name
            if p.entity_type == 'Artist' and p.entity_id:
                name = artist_name_map.get(p.entity_id, name)
            contract_dict["parties"].append({"role": p.role, "name": name or f"{p.entity_type} #{p.entity_id}"})
            
        contract_dict["linked_works"] = []
        contract_dict["linked_releases"] = []
        for a in c_assets:
            if a.asset_type == 'Work':
                w = next((w for w in works_raw if w.id == a.asset_id), None)
                if w: contract_dict["linked_works"].append({"id": w.id, "title": w.title})
            elif a.asset_type == 'Release':
                r = next((r for r in releases_raw if r.id == a.asset_id), None)
                if r: contract_dict["linked_releases"].append({"id": r.id, "title": r.title})
            
        data["contracts"].append(contract_dict)
        
    # Process Tracks
    for t in tracks_raw:
        parent_release = next((r for r in releases_raw if r.id == t.release_id), None)
        linked_work = next((w for w in works_raw if w.id == t.work_id), None)
        
        has_contract = ('Track', t.id) in contract_assets_by_type or ('Release', t.release_id) in contract_assets_by_type
        if not has_contract:
            data["red_flags"]["tracks_no_contract"].append({"id": t.id, "title": t.title, "release_id": t.release_id})
        if not t.work_id:
            data["red_flags"]["tracks_no_work"].append({"id": t.id, "title": t.title, "release_id": t.release_id})

        rel_cover_path = copy_asset(parent_release.cover_art_url) if parent_release else None
        
        data["tracks"].append({
            "id": t.id,
            "title": t.title,
            "duration": str(t.duration) if t.duration else "N/A",
            "release": parent_release.title if parent_release else "No Release",
            "release_cover": rel_cover_path,
            "work": linked_work.title if linked_work else "No Work",
            "isrc_code": t.isrc_code
        })
        
    # Process Releases
    for r in releases_raw:
        r_tracks = tracks_by_release.get(r.id, [])
        artist_id_list = []
        if r.artist_id: artist_id_list.append(r.artist_id)
        if r.artist_ids: artist_id_list.extend(r.artist_ids)
        
        has_contract = ('Release', r.id) in contract_assets_by_type or any(('Track', t.id) in contract_assets_by_type for t in r_tracks)
        if not has_contract:
            data["red_flags"]["releases_no_contract"].append({"id": r.id, "title": r.title, "date": str(r.release_date)})
            
        has_artist_contract = any(('Artist', aid) in contract_parties_by_entity for aid in artist_id_list)
        status_quo = compute_release_status(r, r_tracks, has_contract, has_artist_contract)
        
        cover_path = copy_asset(r.cover_art_url)

        data["releases"].append({
            "id": r.id,
            "title": r.title,
            "date": str(r.release_date) if r.release_date else "N/A",
            "status_quo": status_quo,
            "cover_art_url": cover_path,
            "artist_network": [artist_name_map.get(aid, user_map.get(aid, f"Entity #{aid}")) for aid in artist_id_list],
            "tracks": [{"id": t.id, "title": t.title, "work_id": t.work_id} for t in r_tracks]
        })
        
    # Process Artists
    for a in artists_raw:
        artist_releases = [r for r in releases_raw if a.id == r.artist_id or (r.artist_ids and a.id in r.artist_ids)]
        artist_tracks = [t for t in tracks_raw if (t.artist_ids and a.id in t.artist_ids)]
        
        avatar_path = copy_asset(a.profile_image_url)
        
        data["artists"].append({
            "id": a.id,
            "name": a.name,
            "type": a.artist_kind,
            "avatar_url": avatar_path,
            "releases_count": len(artist_releases),
            "tracks_count": len(artist_tracks),
            "releases": [{"id": r.id, "title": r.title} for r in artist_releases],
            "tracks": [{"id": t.id, "title": t.title} for t in artist_tracks]
        })
        
    db.close()
    return data

def generate_html(data):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    logo_file = "m2kr logo variations - new-01.png"
    logo_src = os.path.join(base_dir, logo_file)
    logo_path = ""
    
    if os.path.exists(logo_src):
        dst = os.path.join(base_dir, "report", "assets", logo_file)
        try:
            shutil.copy2(logo_src, dst)
            import urllib.parse
            logo_path = f"assets/{urllib.parse.quote(logo_file)}"
        except: pass
    
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>M2KR Catalog Status Q1 2026</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-dark: #0f172a; --bg-panel: #1e293b; --text-main: #f8fafc; --text-muted: #94a3b8;
            --accent: #38bdf8; --danger: #ef4444; --warning: #f59e0b; --success: #10b981;
            --sidebar-width: 320px;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: 'Outfit', sans-serif; background: var(--bg-dark); color: var(--text-main); line-height: 1.6; display: flex; flex-direction: row-reverse; min-height: 100vh; overflow-x: hidden; }}
        
        .sidebar {{ width: var(--sidebar-width); background: #020617; padding: 40px 30px; display: flex; flex-direction: column; border-left: 1px solid rgba(255,255,255,0.05); position: fixed; right: 0; top: 0; bottom: 0; z-index: 1000; }}
        .main-content {{ flex: 1; margin-right: var(--sidebar-width); padding: 60px 80px; }}
        
        .nav-link {{ color: var(--text-muted); text-decoration: none; font-size: 1.1rem; padding: 12px 15px; border-radius: 12px; transition: all 0.2s; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 500; }}
        .nav-link:hover {{ background: rgba(255,255,255,0.05); color: var(--accent); }}
        .nav-link.active {{ background: rgba(56, 189, 248, 0.1); color: var(--accent); }}
        
        .stat-card {{ background: linear-gradient(145deg, var(--bg-panel), #151e2d); padding: 25px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.3s; cursor: pointer; position: relative; overflow: hidden; }}
        .stat-card:hover {{ transform: translateY(-5px); border-color: var(--accent); }}
        .view-section {{ display: none; }} .view-section.active {{ display: block; animation: fadeIn 0.4s ease forwards; }}
        @keyframes fadeIn {{ from {{ opacity: 0; transform: translateY(10px); }} to {{ opacity: 1; transform: translateY(0); }} }}

        .expandable-content {{ display: none !important; }}
        .stat-card.expanded .expandable-content {{ display: block !important; padding: 20px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 15px; background: rgba(0,0,0,0.2); }}
        
        .badge {{ padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }}
        .badge.neutral {{ background: rgba(255,255,255,0.1); color: var(--text-muted); }}
        .badge.green {{ background: rgba(16, 185, 129, 0.1); color: var(--success); }}
        .badge.red {{ background: rgba(239, 68, 68, 0.1); color: var(--danger); }}

        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th {{ text-align: left; padding: 15px; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.1); }}
        td {{ padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }}
        
        .sub-list-item {{ font-size: 0.85rem; padding: 4px 0; color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.02); }}
        .sub-list-item:last-child {{ border-bottom: none; }}
        
        @media (max-width: 1024px) {{ body {{ flex-direction: column; }} .sidebar {{ position: static; width: 100%; border-left: none; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 20px; }} .main-content {{ margin-right: 0; padding: 30px; }} }}
    </style>
</head>
<body>
    <div class="sidebar">
        <div style="margin-bottom: 40px; text-align: center;">
            <div style="margin: 0 auto; width: 140px; height: 140px; border-radius: 50%; overflow: hidden; background: #2a364d; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <img src="{logo_path}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Consolidated Data Audit Q1 2026</div>
        </div>
        <nav style="display: flex; flex-direction: column; gap: 10px;">
            <a id="nav-dashboard" class="nav-link active" onclick="showView('dashboard')">Quick Stats <span>📊</span></a>
            <a id="nav-releases" class="nav-link" onclick="showView('releases')">Releases <span>💿</span></a>
            <a id="nav-artists" class="nav-link" onclick="showView('artists')">Artists <span>👤</span></a>
            <a id="nav-tracks" class="nav-link" onclick="showView('tracks')">Tracks <span>🎵</span></a>
            <a id="nav-contracts" class="nav-link" onclick="showView('contracts')">Contracts <span>📄</span></a>
            <a id="nav-red-flags" class="nav-link" onclick="showView('red-flags')">Red Flags <span class="badge red" id="nav-red-flag-count">0</span></a>
        </nav>
    </div>

    <div class="main-content">
        <section id="dashboard" class="view-section active">
            <h1 style="font-size: 3rem; margin-bottom: 40px; font-weight: 800;">Catalog Overview</h1>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 25px;">
                <div class="stat-card"><div style="font-size: 3.5rem; font-weight: 800; color: var(--accent);" id="stat-total-releases">0</div><div style="color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Releases</div></div>
                <div class="stat-card"><div style="font-size: 3.5rem; font-weight: 800;" id="stat-total-tracks">0</div><div style="color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Tracks</div></div>
                <div class="stat-card"><div style="font-size: 3.5rem; font-weight: 800;" id="stat-total-works">0</div><div style="color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Works</div></div>
                <div class="stat-card"><div style="font-size: 3.5rem; font-weight: 800;" id="stat-total-contracts">0</div><div style="color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Contracts</div></div>
            </div>
            
            <h2 style="margin-top: 60px; margin-bottom: 25px;">Critical Health Metrics</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                <div class="stat-card" style="border-left: 5px solid var(--danger);"><div style="font-size: 2rem; font-weight: 800; color: var(--danger);" id="stat-rel-no-con">0</div><div style="font-size: 0.9rem; color: var(--text-muted);">Releases missing Parent Contract</div></div>
                <div class="stat-card" style="border-left: 5px solid var(--danger);"><div style="font-size: 2rem; font-weight: 800; color: var(--danger);" id="stat-trk-no-con">0</div><div style="font-size: 0.9rem; color: var(--text-muted);">Tracks missing Contract association</div></div>
                <div class="stat-card" style="border-left: 5px solid var(--warning);"><div style="font-size: 2rem; font-weight: 800; color: var(--warning);" id="stat-con-no-asset">0</div><div style="font-size: 0.9rem; color: var(--text-muted);">Contracts without mapped Assets</div></div>
            </div>
        </section>

        <section id="releases" class="view-section">
            <h1 style="font-size: 2.5rem; margin-bottom: 30px; font-weight: 800;">Catalog Releases</h1>
            <div id="releases-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 30px;"></div>
        </section>

        <section id="artists" class="view-section">
            <h1 style="font-size: 2.5rem; margin-bottom: 30px; font-weight: 800;">Artist Portfolio</h1>
            <div id="artists-list"></div>
        </section>

        <section id="tracks" class="view-section">
            <h1 style="font-size: 2.5rem; margin-bottom: 30px; font-weight: 800;">Track Repository</h1>
            <div id="tracks-list" style="display: flex; flex-direction: column; gap: 15px;"></div>
        </section>

        <section id="contracts" class="view-section">
            <h1 style="font-size: 2.5rem; margin-bottom: 30px; font-weight: 800;">Contractual Metadata</h1>
            <div id="contracts-list" style="display: flex; flex-direction: column; gap: 15px;"></div>
        </section>

        <section id="red-flags" class="view-section">
            <h1 style="font-size: 2.5rem; margin-bottom: 30px; font-weight: 800;">Compliance Audit</h1>
            <div id="red-flags-content"></div>
        </section>
    </div>

    <script>
        const data = {json.dumps(data)};

        function showView(viewId) {{
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(viewId);
            if(target) target.classList.add('active');
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            const nav = document.getElementById('nav-' + viewId);
            if(nav) nav.classList.add('active');
        }}

        function init() {{
            // Stats
            document.getElementById('stat-total-releases').innerText = data.stats.total_releases;
            document.getElementById('stat-total-tracks').innerText = data.stats.total_tracks;
            document.getElementById('stat-total-works').innerText = data.stats.total_works;
            document.getElementById('stat-total-contracts').innerText = data.stats.total_contracts;
            
            document.getElementById('stat-rel-no-con').innerText = data.red_flags.releases_no_contract.length;
            document.getElementById('stat-trk-no-con').innerText = data.red_flags.tracks_no_contract.length;
            document.getElementById('stat-con-no-asset').innerText = data.red_flags.contracts_no_assets.length;
            document.getElementById('nav-red-flag-count').innerText = data.red_flags.releases_no_contract.length + data.red_flags.tracks_no_contract.length;

            // Releases
            const relList = document.getElementById('releases-list');
            relList.innerHTML = data.releases.map(r => `
                <div class="stat-card" style="padding: 0;" onclick="this.classList.toggle('expanded')">
                    <div style="width:100%; aspect-ratio:1; background:#2a364d; display:flex; align-items:center; justify-content:center;">
                        ${{r.cover_art_url ? `<img src="${{r.cover_art_url}}" style="width:100%; height:100%; object-fit:cover;">` : `💿`}}
                    </div>
                    <div style="padding:15px;">
                        <h3 style="font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${{r.title}}</h3>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">${{r.date}}</div>
                    </div>
                    <div class="expandable-content">
                        <h4 style="font-size:0.7rem; color:var(--accent); text-transform:uppercase; margin-bottom:8px;">Tracklist</h4>
                        ${{r.tracks.map(t => `<div class="sub-list-item">${{t.title}}</div>`).join('')}}
                        <h4 style="font-size:0.7rem; color:var(--accent); text-transform:uppercase; margin-top:12px; margin-bottom:8px;">Artists</h4>
                        ${{r.artist_network.map(a => `<div class="sub-list-item">${{a}}</div>`).join('')}}
                    </div>
                </div>
            `).join('');

            // Artists
            const artList = document.getElementById('artists-list');
            artList.innerHTML = '<table><thead><tr><th>Artist</th><th>Type</th><th>Stats</th><th>Works</th></tr></thead><tbody>' + 
                data.artists.map(a => `
                    <tr>
                        <td><div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:30px; height:30px; border-radius:50%; background:#2a364d; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                                ${{a.avatar_url ? `<img src="${{a.avatar_url}}" style="width:100%; height:100%; object-fit:cover;">` : `👤`}}
                            </div>
                            <strong>${{a.name}}</strong>
                        </div></td>
                        <td><span class="badge neutral">${{a.type || 'Artist'}}</span></td>
                        <td><div style="color:var(--accent); font-weight:600;">${{a.tracks_count}} Tracks</div></td>
                        <td><div style="font-size:0.8rem; color:var(--text-muted);">${{a.releases.map(r => r.title).join(', ')}}</div></td>
                    </tr>
                `).join('') + '</tbody></table>';

            // Tracks
            const trkList = document.getElementById('tracks-list');
            trkList.innerHTML = data.tracks.map(t => `
                <div class="stat-card" style="display:flex; align-items:center; gap:20px; padding:15px; cursor:default;">
                    <div style="width:50px; height:50px; border-radius:8px; background:#0f172a; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.1);">
                        ${{t.release_cover ? `<img src="${{t.release_cover}}" style="width:100%; height:100%; object-fit:cover;">` : `🎵`}}
                    </div>
                    <div style="flex:1;">
                        <span style="font-weight:600; font-size:1.1rem;">${{t.title}}</span>
                        <div style="font-size:0.85rem; color:var(--text-muted);">on <strong style="color:white;">${{t.release}}</strong> • Work: ${{t.work}}</div>
                    </div>
                    <div style="font-family:monospace; font-size:0.8rem; color:var(--text-muted);">${{t.isrc_code || 'MISSING'}}</div>
                </div>
            `).join('');

            // Contracts
            const conList = document.getElementById('contracts-list');
            conList.innerHTML = data.contracts.map(c => `
                <div class="stat-card" onclick="this.classList.toggle('expanded')">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="font-size:1.1rem;">${{c.title}}</h3>
                            <div style="font-size:0.85rem; color:var(--text-muted);">Type: ${{c.type}} • Parties: ${{c.parties.length}}</div>
                        </div>
                        <span class="badge ${{c.status === 'Active' ? 'green' : 'neutral'}}">${{c.status}}</span>
                    </div>
                    <div class="expandable-content">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                            <div><h4 style="font-size:0.75rem; color:var(--accent); text-transform:uppercase; margin-bottom:10px;">Parties</h4>${{c.parties.map(p => `<div class="sub-list-item">${{p.name}} (${{p.role}})</div>`).join('')}}</div>
                            <div><h4 style="font-size:0.75rem; color:var(--accent); text-transform:uppercase; margin-bottom:10px;">Assets</h4>${{c.linked_releases.map(r => `<div class="sub-list-item">Release: ${{r.title}}</div>`).join('')}}${{c.linked_works.map(w => `<div class="sub-list-item">Work: ${{w.title}}</div>`).join('')}}</div>
                        </div>
                    </div>
                </div>
            `).join('');

            // Flags
            const flagList = document.getElementById('red-flags-content');
            const groups = [
                {{ title: 'Releases missing Contracts', items: data.red_flags.releases_no_contract }},
                {{ title: 'Tracks missing Contracts', items: data.red_flags.tracks_no_contract }},
                {{ title: 'Tracks missing Works', items: data.red_flags.tracks_no_work }},
                {{ title: 'Empty Contracts', items: data.red_flags.contracts_no_assets }}
            ];
            flagList.innerHTML = groups.map(g => g.items.length > 0 ? `
                <div style="margin-bottom:40px;">
                    <h2 style="color:var(--danger); margin-bottom:15px;">${{g.title}} (${{g.items.length}})</h2>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:15px;">
                        ${{g.items.map(i => `<div class="stat-card" style="border-left:4px solid var(--danger);">${{i.title}}</div>`).join('')}}
                    </div>
                </div>
            ` : '').join('') || '<div class="stat-card" style="text-align:center; padding:40px;">Catalog is healthy! No red flags.</div>';
        }}

        window.onload = init;
    </script>
</body>
</html>
"""
    output_path = os.path.join(base_dir, "report", "M2KR_Catalog_Status_Q1_2026.html")
    with open(output_path, "w") as f:
        f.write(html_template)
    print(f"✅ Report successfully generated at: {{output_path}}")

if __name__ == "__main__":
    print("Gathering catalog data...")
    report_data = fetch_data()
    print("Generating HTML...")
    generate_html(report_data)
    print("Done!")
