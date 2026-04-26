'use strict';
/* ═══════════════════════════════
   نظام جرد المستودع — App Logic
═══════════════════════════════ */

/* ═══════════════════════════════════════════
   DATA
═══════════════════════════════════════════ */
var mode = 'in';
var ents = [];
var filt = [];

try {
  var _s = localStorage.getItem('inv3');
  if (_s) { ents = JSON.parse(_s); filt = ents.slice(); }
} catch(e) {}

function sv() {
  try { localStorage.setItem('inv3', JSON.stringify(ents)); } catch(e) {}
}

/* ═══════════════════════════════════════════
   MODE
═══════════════════════════════════════════ */
function setM(m) {
  mode = m;
  document.getElementById('ti').className = 'mode-tab' + (m === 'in' ? ' a-in' : '');
  document.getElementById('to').className = 'mode-tab' + (m === 'out' ? ' a-out' : '');
  var b = document.getElementById('badd');
  b.className   = 'btn-submit ' + (m === 'in' ? 'm-in' : 'm-out');
  b.textContent = m === 'in' ? '➕ إضافة للجرد' : '➖ تسجيل صرف / خروج';
}

/* ═══════════════════════════════════════════
   BARCODE INPUT
═══════════════════════════════════════════ */
var bct;
function onBc(v) {
  clearTimeout(bct);
  chkDup(v);
  if (v.length < 3) return;
  bct = setTimeout(function() {
    // Find the latest 'in' entry for this barcode to get product info
    var allMatches = ents.filter(function(e) { return e.barcode === v; });
    if (!allMatches.length) return;
    // Prefer latest 'in' entry for name/size/price, fallback to any entry
    var p = allMatches.slice().reverse().find(function(e) { return e.type === 'in'; })
         || allMatches[allMatches.length - 1];
    var nm = document.getElementById('nm');
    var sz = document.getElementById('sz');
    var lc = document.getElementById('lc');
    var pr = document.getElementById('pr');
    // In 'out' mode: always fill (override) — user is searching for product to withdraw
    if (mode === 'out') {
      nm.value = p.name     || '';
      sz.value = p.size     || '';
      lc.value = p.location || '';
      pr.value = p.price    || '';
      // Flash fields to show they were filled
      [nm, sz, lc, pr].forEach(function(el) {
        if (el.value) {
          el.style.borderColor = 'var(--gn)';
          setTimeout(function(){ el.style.borderColor = ''; }, 1200);
        }
      });
    } else {
      // In 'in' mode: only fill if empty
      if (!nm.value) nm.value = p.name     || '';
      if (!sz.value) sz.value = p.size     || '';
      if (!lc.value) lc.value = p.location || '';
      if (!pr.value) pr.value = p.price    || '';
    }
  }, 280);
}

/* ── Name autofill ── */
var nmTm;
function onNm(v) {
  clearTimeout(nmTm);
  if (v.length < 2) return;
  nmTm = setTimeout(function() {
    var lv = v.toLowerCase();
    var match = ents.slice().reverse().find(function(e) {
      return e.name && e.name.toLowerCase().indexOf(lv) >= 0 && e.barcode;
    });
    if (match) {
      var bcEl = document.getElementById('bc');
      var szEl = document.getElementById('sz');
      var lcEl = document.getElementById('lc');
      var prEl = document.getElementById('pr');
      if (!bcEl.value) { bcEl.value = match.barcode; onBc(match.barcode); }
      if (!szEl.value) szEl.value = match.size     || '';
      if (!lcEl.value) lcEl.value = match.location || '';
      if (!prEl.value) prEl.value = match.price    || '';
    }
  }, 350);
}

/* ═══════════════════════════════════════════
   DUPLICATE CHECK
═══════════════════════════════════════════ */
function chkDup(v) {
  var box = document.getElementById('db');
  if (!v || v.length < 3) { box.classList.remove('on'); return; }
  var m = ents.filter(function(e) { return e.barcode === v; });
  if (!m.length) { box.classList.remove('on'); return; }
  box.classList.add('on');
  var inQ  = m.filter(function(e){return e.type==='in';}).reduce(function(s,e){return s+e.qty;}, 0);
  var outQ = m.filter(function(e){return e.type==='out';}).reduce(function(s,e){return s+e.qty;}, 0);
  var bal  = inQ - outQ;
  document.getElementById('dtl').innerHTML =
    '<span>الإضافات: <strong style="color:var(--gn)">' + inQ + '</strong></span>' +
    '<span>الصرف: <strong style="color:var(--rd)">' + outQ + '</strong></span>' +
    '<span>الرصيد: <strong style="color:' + (bal >= 0 ? 'var(--gn)' : 'var(--rd)') + '">' + bal + '</strong></span>';
  document.getElementById('drs').innerHTML = m.slice(0,3).map(function(e) {
    return '<div class="dup-row">' +
      '<span class="dbdg ' + (e.type==='in'?'dbi':'dbo') + '">' + (e.type==='in'?'إضافة':'صرف') + '</span>' +
      '<span style="color:var(--tx)">' + e.name + '</span>' +
      '<span>الكمية: <strong style="color:var(--tx)">' + e.qty + '</strong></span>' +
      '<span style="color:var(--tx3)">' + e.date + '</span></div>';
  }).join('');
  document.getElementById('dm').textContent = m.length > 3 ? '+ ' + (m.length-3) + ' حركة أخرى' : '';
}

/* ═══════════════════════════════════════════
   FIELD NAV
═══════════════════════════════════════════ */
function nxt(id) {
  var el = document.getElementById(id);
  if (el) el.focus();
}

/* ═══════════════════════════════════════════
   STOCK ERROR MODAL
═══════════════════════════════════════════ */
function showStockErr(name, avail, req) {
  document.getElementById('se-name').textContent  = name;
  document.getElementById('se-avail').textContent = avail;
  document.getElementById('se-req').textContent   = req;
  var hint = avail <= 0
    ? 'لا يوجد رصيد متاح لهذه القطعة في المستودع.'
    : 'الرصيد الحالي ' + avail + ' فقط، لا يمكن صرف ' + req + '. قلل الكمية إلى ' + avail + ' أو أقل.';
  document.getElementById('se-hint').textContent = hint;
  var m = document.getElementById('stock-err-modal');
  m.style.display = 'flex';
}

function hideStockErr() {
  var m = document.getElementById('stock-err-modal');
  m.style.display = 'none';
  setTimeout(function() { document.getElementById('qt').focus(); }, 100);
}

/* ═══════════════════════════════════════════
   SUBMIT
═══════════════════════════════════════════ */
function sub() {
  var bc    = document.getElementById('bc').value.trim();
  var name  = document.getElementById('nm').value.trim();
  var size  = document.getElementById('sz').value.trim();
  var qty   = parseInt(document.getElementById('qt').value) || 1;
  var price = document.getElementById('pr').value.trim();
  var loc   = document.getElementById('lc').value.trim();
  var note  = document.getElementById('nt').value.trim();

  if (!bc)   { tst('أدخل الباركود',    'r'); document.getElementById('bc').focus(); return; }
  if (!name) { tst('أدخل اسم المنتج', 'r'); document.getElementById('nm').focus(); return; }

  /* ── Stock check ── */
  if (mode === 'out') {
    var bcE  = ents.filter(function(e){ return e.barcode === bc; });
    var inQ  = bcE.filter(function(e){return e.type==='in';}).reduce(function(s,e){return s+e.qty;},0);
    var outQ = bcE.filter(function(e){return e.type==='out';}).reduce(function(s,e){return s+e.qty;},0);
    var bal  = inQ - outQ;
    if (bcE.length === 0) { tst('هذا الباركود غير مسجل في المستودع', 'r'); return; }
    if (qty > bal) { showStockErr(name || bc, bal, qty); return; }
  }

  var now = new Date();
  var ds  = now.toLocaleDateString('ar-SA-u-nu-latn') + '  ' +
            now.toLocaleTimeString('ar-SA-u-nu-latn', {hour:'2-digit', minute:'2-digit'});

  ents.unshift({ id: Date.now(), barcode: bc, name: name, size: size, qty: qty,
                 price: price, location: loc, note: note, type: mode, date: ds });
  sv();
  filt = ents.slice();

  ['bc','nm','sz','nt','pr'].forEach(function(id){ document.getElementById(id).value = ''; });
  document.getElementById('qt').value = '1';
  document.getElementById('db').classList.remove('on');
  document.getElementById('bc').focus();

  rnd(filt);
  upSt();
  buildSummary();
  tst(mode === 'in' ? 'تمت الإضافة ✓' : 'تم تسجيل الصرف ✓', mode === 'in' ? 'g' : 'r');
}

/* ═══════════════════════════════════════════
   DELETE
═══════════════════════════════════════════ */
function delE(id) {
  ents = ents.filter(function(e){ return e.id !== id; });
  sv();
  filt = filt.filter(function(e){ return e.id !== id; });
  rnd(filt);
  upSt();
  buildSummary();
}

/* ═══════════════════════════════════════════
   FILTER
═══════════════════════════════════════════ */
function filE(q) {
  if (!q) {
    filt = ents.slice();
  } else {
    var lq = q.toLowerCase();
    filt = ents.filter(function(e) {
      return (e.barcode||'').toLowerCase().indexOf(lq) >= 0 ||
             (e.name||'').toLowerCase().indexOf(lq)    >= 0 ||
             (e.size||'').toLowerCase().indexOf(lq)    >= 0 ||
             (e.location||'').toLowerCase().indexOf(lq)>= 0;
    });
  }
  rnd(filt);
}

/* ═══════════════════════════════════════════
   RENDER
═══════════════════════════════════════════ */
function rnd(data) {
  var emp = document.getElementById('emp');
  var tb  = document.getElementById('tb');
  var cl  = document.getElementById('cl');
  if (!data.length) {
    emp.style.display = 'block'; tb.innerHTML = ''; cl.innerHTML = '';
    return;
  }
  emp.style.display = 'none';

  tb.innerHTML = data.map(function(e) {
    return '<tr class="' + (e.type==='in'?'r-in':'r-out') + '">' +
      '<td class="td-bc" title="' + e.barcode + '">' + e.barcode + '</td>' +
      '<td><strong>' + e.name + '</strong></td>' +
      '<td style="color:var(--tx2)">' + (e.size||'—') + '</td>' +
      '<td style="text-align:center;font-weight:900;font-size:16px;color:' + (e.type==='in'?'var(--gn)':'var(--rd)') + '">' + e.qty + '</td>' +
      '<td style="color:var(--tx2)">' + (e.price ? e.price+' ر.س' : '—') + '</td>' +
      '<td style="color:var(--tx2)">' + (e.location||'—') + '</td>' +
      '<td><span class="badge ' + (e.type==='in'?'b-in':'b-out') + '">' + (e.type==='in'?'إضافة':'صرف') + '</span></td>' +
      '<td class="td-date">' + e.date + '</td>' +
      '<td><button class="btn-del" onclick="delE(' + e.id + ')">✕</button></td></tr>';
  }).join('');

  cl.innerHTML = data.map(function(e) {
    return '<div class="card">' +
      '<div class="card-stripe ' + (e.type==='in'?'s-in':'s-out') + '"></div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + e.name + '</div>' +
        '<div class="card-meta">' +
          '<span class="badge ' + (e.type==='in'?'b-in':'b-out') + '">' + (e.type==='in'?'إضافة':'صرف') + '</span>' +
          (e.size ? '<span>' + e.size + '</span>' : '') +
          (e.location ? '<span style="color:var(--tx3)">📍 ' + e.location + '</span>' : '') +
        '</div>' +
        '<div class="card-bc">' + e.barcode + '</div>' +
      '</div>' +
      '<div class="card-right">' +
        '<div class="card-qty ' + (e.type==='in'?'q-in':'q-out') + '">' + (e.type==='in'?'+':'−') + e.qty + '</div>' +
        (e.price ? '<div style="font-size:10px;color:var(--yw)">' + e.price + ' ر.س</div>' : '') +
        '<div class="card-date">' + e.date + '</div>' +
        '<button class="btn-del" onclick="delE(' + e.id + ')">✕</button>' +
      '</div></div>';
  }).join('');
}

/* ═══════════════════════════════════════════
   STATS
═══════════════════════════════════════════ */
function upSt() {
  document.getElementById('s-t').textContent = ents.length;
  document.getElementById('s-i').textContent = ents.filter(function(e){return e.type==='in';}).length;
  document.getElementById('s-o').textContent = ents.filter(function(e){return e.type==='out';}).length;
}

/* ═══════════════════════════════════════════
   CLEAR ALL
═══════════════════════════════════════════ */
function clrAll() {
  if (!ents.length) return;
  if (confirm('هل أنت متأكد من مسح جميع السجلات؟ لا يمكن التراجع.')) {
    ents = []; filt = []; sv(); rnd([]); upSt(); buildSummary();
    tst('تم مسح جميع السجلات', 'r');
  }
}

/* ═══════════════════════════════════════════
   EXPORT EXCEL
═══════════════════════════════════════════ */
function expXl() {
  if (!ents.length) { tst('لا يوجد بيانات للتصدير', 'r'); return; }
  var rows = [['الباركود','اسم المنتج','السعة','الكمية','السعر','الموقع','النوع','ملاحظة','التاريخ والوقت']];
  ents.forEach(function(e) {
    rows.push([e.barcode, e.name, e.size||'', e.qty, e.price||'', e.location||'',
      e.type==='in' ? 'إضافة للجرد' : 'صرف / خروج', e.note||'', e.date]);
  });
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:20},{wch:26},{wch:14},{wch:8},{wch:10},{wch:16},{wch:14},{wch:18},{wch:22}];
  XLSX.utils.book_append_sheet(wb, ws, 'جرد المستودع');
  var d = new Date();
  XLSX.writeFile(wb, 'جرد_' + d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate() + '.xlsx');
  tst('تم تصدير الملف ✓', 'g');
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
var ttm;
function tst(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast on' + (type ? ' ' + type : '');
  clearTimeout(ttm);
  ttm = setTimeout(function(){ t.className = 'toast'; }, 2400);
}

/* ═══════════════════════════════════════════
   INVENTORY SUMMARY
═══════════════════════════════════════════ */
var invVisible = true;

function toggleInv() {
  invVisible = !invVisible;
  document.getElementById('inv-grid').style.display  = invVisible ? '' : 'none';
  document.getElementById('inv-toggle').textContent  = invVisible ? 'إخفاء ▲' : 'إظهار ▼';
}

function buildSummary() {
  var map = {};
  ents.forEach(function(e) {
    if (!map[e.barcode]) {
      map[e.barcode] = { barcode: e.barcode, name: e.name||'', size: e.size||'', inQ: 0, outQ: 0 };
    }
    if (e.type === 'in')  map[e.barcode].inQ  += e.qty;
    else                  map[e.barcode].outQ += e.qty;
    if (e.name) map[e.barcode].name = e.name;
    if (e.size) map[e.barcode].size = e.size;
  });

  var items = Object.values(map);
  var grid  = document.getElementById('inv-grid');

  if (!items.length) {
    grid.innerHTML = '<div class="inv-empty">لا يوجد بيانات بعد</div>';
    return;
  }

  items.sort(function(a, b) {
    var ba = a.inQ - a.outQ, bb = b.inQ - b.outQ;
    if (ba < 0 && bb >= 0) return -1;
    if (bb < 0 && ba >= 0) return  1;
    return a.name.localeCompare(b.name, 'ar');
  });

  grid.innerHTML = items.map(function(item) {
    var bal  = item.inQ - item.outQ;
    var cls  = bal > 0 ? 'bal-pos' : bal < 0 ? 'bal-neg' : 'bal-zer';
    var warn = bal < 0 ? ' <span style="color:var(--rd);font-size:10px">⚠️ عجز</span>'
             : bal === 0 ? ' <span style="color:var(--tx3);font-size:10px">نفدت</span>' : '';
    var safeBC   = item.barcode.replace(/'/g, "\\'");
    var safeName = item.name.replace(/'/g, "\\'");
    var safeSize = item.size.replace(/'/g, "\\'");
    return '<div class="inv-card" onclick="fillFromCard(\''+safeBC+'\',\''+safeName+'\',\''+safeSize+'\')" style="cursor:pointer" title="اضغط لملء البيانات">' +
      '<div class="inv-card-name" title="' + item.name + '">' + item.name + '</div>' +
      '<div class="inv-card-bc">' + item.barcode + (item.size ? ' · ' + item.size : '') + '</div>' +
      '<div class="inv-card-row"><span class="inv-card-lbl">الرصيد' + warn + '</span>' +
      '<span class="inv-bal ' + cls + '">' + bal + '</span></div>' +
      '<div class="inv-mini">' +
        '<span>دخل: <strong style="color:var(--gn)">' + item.inQ + '</strong></span>' +
        '<span>خرج: <strong style="color:var(--rd)">' + item.outQ + '</strong></span>' +
      '</div>' +
      '<div style="margin-top:6px;font-size:10px;color:var(--tx3);text-align:center">اضغط للتعبئة ↑</div>' +
      '</div>';
  }).join('');
}

/* ═══════════════════════════════════════════
   LOGOUT
═══════════════════════════════════════════ */
function showLo() { document.getElementById('lo-modal').style.display = 'flex'; }
function hideLo()  { document.getElementById('lo-modal').style.display = 'none'; }
function doLo() {
  localStorage.removeItem('inv_auth');
  hideLo();
  document.getElementById('ls').style.display = 'flex';
  document.getElementById('un').value = '';
  document.getElementById('pw').value = '';
  document.getElementById('lerr').textContent = '';
  setTimeout(function(){ document.getElementById('un').focus(); }, 200);
  tst('تم تسجيل الخروج', 'y');
}

/* ═══════════════════════════════════════════
   CAMERA
═══════════════════════════════════════════ */
var camOn = false, stream = null, scanTm = null;

async function opCam() {
  var ov  = document.getElementById('cov');
  var vid = document.getElementById('scv');
  var st  = document.getElementById('cst');
  ov.style.display = 'flex';
  camOn = true;
  st.className   = 'cam-st';
  st.textContent = 'جاري تشغيل الكاميرا...';
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    vid.srcObject = stream;
    await vid.play();
    st.textContent = 'وجّه الكاميرا نحو الباركود';
    stScan(vid, st);
  } catch(err) {
    st.className   = 'cam-st er';
    st.textContent = err.name === 'NotAllowedError'
      ? 'لم يتم السماح بالكاميرا — اضغط السماح عند ظهور الطلب'
      : 'تعذّر فتح الكاميرا: ' + err.message;
  }
}

function stScan(vid, st) {
  function onF(code) {
    clCam();
    document.getElementById('bc').value = code;
    onBc(code);
    tst('تم مسح الباركود \u2713', 'g');
    setTimeout(function(){ document.getElementById('nm').focus(); }, 300);
  }

  st.textContent = '\u0648\u062c\u0651\u0647 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627 \u0646\u062d\u0648 \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062f';

  /* ── ZXing canvas scan (correct API) ── */
  try {
    var cv  = document.createElement('canvas');
    var ctx = cv.getContext('2d', { willReadFrequently: true });

    /* Use ZXingBrowser.BrowserMultiFormatReader + ZXingBrowser.HTMLCanvasElementLuminanceSource */
    var reader = new ZXingBrowser.BrowserMultiFormatReader();

    scanTm = setInterval(function() {
      if (!camOn || vid.readyState < 2) return;
      try {
        cv.width  = vid.videoWidth  || 640;
        cv.height = vid.videoHeight || 480;
        ctx.drawImage(vid, 0, 0);

        /* Use HTMLCanvasElementLuminanceSource directly from bundled lib */
        var lum = new ZXingBrowser.HTMLCanvasElementLuminanceSource(cv);
        var bmp = new ZXingBrowser.BinaryBitmap(new ZXingBrowser.HybridBinarizer(lum));
        var res = reader.decodeBitmap(bmp);
        if (res) onF(res.getText());
      } catch(ignore) { /* no barcode in frame — normal */ }
    }, 200);
    return;
  } catch(e1) {
    console.warn('ZXing canvas failed:', e1);
  }

  /* ── Native BarcodeDetector fallback (Chrome Android) ── */
  if ('BarcodeDetector' in window) {
    try {
      var det = new BarcodeDetector({
        formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e','data_matrix','itf']
      });
      scanTm = setInterval(async function() {
        if (!camOn || vid.readyState < 2) return;
        try { var r = await det.detect(vid); if (r && r.length) onF(r[0].rawValue); } catch(e) {}
      }, 300);
      return;
    } catch(e2) {
      console.warn('BarcodeDetector failed:', e2);
    }
  }

  /* ── Manual input fallback ── */
  st.className   = 'cam-st er';
  st.textContent = '\u0627\u0643\u062a\u0628 \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062f \u0623\u062f\u0646\u0627\u0647 \u062b\u0645 \u0627\u0636\u063a\u0637 Enter';
  var inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = '\u0627\u0643\u062a\u0628 \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062f \u062b\u0645 \u0627\u0636\u063a\u0637 Enter...';
  inp.style.cssText = [
    'position:absolute','bottom:70px','left:50%','transform:translateX(-50%)',
    'width:82%','padding:13px 16px','font-size:16px','font-family:Cairo,sans-serif',
    'background:rgba(10,40,100,.88)','color:#E8F4FF',
    'border-top:2px solid rgba(220,235,255,.72)',
    'border-left:1px solid rgba(180,210,255,.30)',
    'border-right:1px solid rgba(150,185,255,.18)',
    'border-bottom:1px solid rgba(0,0,0,.50)',
    'border-radius:14px','outline:none','text-align:center','z-index:10',
    'box-shadow:inset 0 3px 0 rgba(255,255,255,.38),0 8px 28px rgba(0,0,0,.60)'
  ].join(';');
  inp.onkeydown = function(e) {
    if (e.key === 'Enter' && inp.value.trim()) onF(inp.value.trim());
  };
  document.querySelector('.cam-body').appendChild(inp);
  setTimeout(function(){ inp.focus(); }, 300);
}

function clCam() {
  camOn = false;
  clearInterval(scanTm); scanTm = null;
  if (stream) { stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; }
  document.getElementById('scv').srcObject = null;
  document.getElementById('cov').style.display = 'none';
}

/* ═══════════════════════════════════════════
   AUTH
═══════════════════════════════════════════ */
/* *** غيّر اسم المستخدم وكلمة المرور هنا *** */
var USERS = { 'admin': '1234' };

function chkPw() {
  var un  = document.getElementById('un').value.trim();
  var pw  = document.getElementById('pw').value;
  var err = document.getElementById('lerr');
  var box = document.querySelector('.l-card');
  if (USERS[un] && USERS[un] === pw) {
    document.getElementById('ls').style.display = 'none';
    localStorage.setItem('inv_auth', btoa(un + ':' + pw));
    document.getElementById('bc').focus();
  } else {
    err.textContent = '❌ اسم المستخدم أو كلمة المرور غير صحيحة';
    box.classList.add('l-shk');
    document.getElementById('pw').value = '';
    setTimeout(function(){ box.classList.remove('l-shk'); err.textContent = ''; }, 2500);
    document.getElementById('pw').focus();
  }
}

/* ── Auto-login check ── */
(function() {
  var stored = localStorage.getItem('inv_auth');
  if (stored) {
    try {
      var parts = atob(stored).split(':');
      var u = parts[0], p = parts.slice(1).join(':');
      if (USERS[u] && USERS[u] === p)
        document.getElementById('ls').style.display = 'none';
    } catch(e) {}
  }
})();


/* ═══════════════════════════════════════════
   FILL FROM SUMMARY CARD
═══════════════════════════════════════════ */
function fillFromCard(barcode, name, size) {
  // Find latest entry for this barcode to get all fields
  var matches = ents.filter(function(e){ return e.barcode === barcode; });
  var latest  = matches.slice().reverse().find(function(e){ return e.type === 'in'; })
             || (matches.length ? matches[matches.length-1] : null);

  // Fill fields
  document.getElementById('bc').value = barcode;
  document.getElementById('nm').value = name;
  document.getElementById('sz').value = size;
  if (latest) {
    document.getElementById('lc').value = latest.location || '';
    document.getElementById('pr').value = latest.price    || '';
  }

  // Show dup info
  chkDup(barcode);

  // Flash all filled fields green
  ['bc','nm','sz','lc','pr'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el.value) {
      el.style.transition   = 'border-color .2s';
      el.style.borderColor  = 'var(--gn)';
      setTimeout(function(){ el.style.borderColor = ''; }, 1400);
    }
  });

  // Scroll to form smoothly
  document.querySelector('.form-sec').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Focus quantity field
  setTimeout(function(){ document.getElementById('qt').focus(); }, 400);

  tst('تم تعبئة بيانات: ' + name, 'g');
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
rnd(filt);
upSt();
buildSummary();

/* ════ SETTINGS PANEL ════ */
var settingsOpen = false;
















function toggleSettings(e){
  if(e) e.stopPropagation();
  var p = document.getElementById('settings-panel');
  if(!p) return;
  settingsOpen = !settingsOpen;
  p.style.display = settingsOpen ? 'block' : 'none';
}

document.addEventListener('click', function(e){
  var btn   = document.getElementById('settings-btn');
  var panel = document.getElementById('settings-panel');
  if(!panel || !btn) return;
  if(panel.style.display === 'block' && !btn.contains(e.target) && !panel.contains(e.target)){
    panel.style.display = 'none';
    settingsOpen = false;
  }
});

function applyWidth(v){
  document.getElementById('val-width').textContent = v + 'px';
  var wrap = document.getElementById('app-wrap');
  if(wrap){ wrap.style.maxWidth = v + 'px'; wrap.style.margin = '0 auto'; }
}

function applyFont(v){
  document.getElementById('val-font').textContent = v + 'px';
  document.body.style.fontSize = v + 'px';
}

function applyPadding(v){
  document.getElementById('val-pad').textContent = v + 'px';
  ['form-sec','stats','inv-sec','search-bar'].forEach(function(cls){
    var el = document.querySelector('.' + cls);
    if(el) el.style.padding = v + 'px';
  });
}

function applyCols(v){
  document.getElementById('val-cols').textContent = v;
  document.querySelectorAll('.fgrid:not(.one)').forEach(function(el){
    el.style.gridTemplateColumns = 'repeat(' + v + ', 1fr)';
  });
}

function applyInvCols(v){
  document.getElementById('val-inv').textContent = v;
  var g = document.getElementById('inv-grid');
  if(g) g.style.gridTemplateColumns = 'repeat(' + v + ', 1fr)';
}

function applyInputH(v){
  document.getElementById('val-inp').textContent = v + 'px';
  document.querySelectorAll('.lg-input, .l-field input, .search-bar input').forEach(function(el){
    el.style.paddingTop    = ((v - 20) / 2) + 'px';
    el.style.paddingBottom = ((v - 20) / 2) + 'px';
  });
}

function applyStatFont(v){
  document.getElementById('val-stat').textContent = v + 'px';
  document.querySelectorAll('.stat-n').forEach(function(el){ el.style.fontSize = v + 'px'; });
}

function syncManual(v){
  document.getElementById('val-manual').textContent = v + 'px';
  document.getElementById('val-width').textContent  = v + 'px';
  var sl = document.querySelectorAll('.sp-slider')[0];
  if(sl) sl.value = Math.min(Math.max(parseInt(v)||1200, 800), 1800);
}

function applyManual(){
  var v = parseInt(document.getElementById('manual-width').value) || 1200;
  v = Math.max(400, Math.min(2560, v));
  document.getElementById('manual-width').value = v;
  syncManual(v);
  applyWidth(v);
}

function quickSize(v){
  document.getElementById('manual-width').value = v;
  syncManual(v); applyWidth(v);
}

function resetSettings(){
  applyWidth(1200);    document.querySelectorAll('.sp-slider')[0].value = 1200;
  applyFont(14);       document.querySelectorAll('.sp-slider')[1].value = 14;
  applyPadding(16);    document.querySelectorAll('.sp-slider')[2].value = 16;
  applyCols(3);        document.querySelectorAll('.sp-slider')[3].value = 3;
  applyInvCols(4);     document.querySelectorAll('.sp-slider')[4].value = 4;
  applyInputH(44);     document.querySelectorAll('.sp-slider')[5].value = 44;
  applyStatFont(28);   document.querySelectorAll('.sp-slider')[6].value = 28;
  var mw = document.getElementById('manual-width');
  if(mw){ mw.value = 1200; syncManual(1200); }
}