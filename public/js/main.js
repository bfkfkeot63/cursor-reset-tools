document.addEventListener('DOMContentLoaded', () => {
  const si = document.getElementById('system-info');
  const cs = document.getElementById('cursor-status');
  const rb = document.getElementById('reset-btn');
  const bp = document.getElementById('bypass-btn');
  const du = document.getElementById('disable-update-btn');
  const pc = document.getElementById('pro-convert-btn');
  const rr = document.getElementById('reset-result');
  const dm = document.getElementById('disclaimer-modal');
  const ad = document.getElementById('accept-disclaimer');
  const mc = document.querySelector('.modal-close');
  
  const cm = () => {
    dm.style.display = 'none';
    localStorage.setItem('disclaimerAccepted', 'true');
    document.body.style.overflow = 'auto';
  };
  
  const sd = () => {
    if (!localStorage.getItem('disclaimerAccepted')) {
      dm.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  };
  
  if (ad) ad.addEventListener('click', cm);
  if (mc) mc.addEventListener('click', cm);
  
  window.addEventListener('click', (e) => {
    if (e.target === dm) cm();
  });
  
  const gs = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      
      let systemHtml = '<table>';
      systemHtml += `<tr><th>Platform</th><td>${data.system.platform}</td></tr>`;
      systemHtml += `<tr><th>OS Release</th><td>${data.system.release}</td></tr>`;
      systemHtml += `<tr><th>Hostname</th><td>${data.system.hostname}</td></tr>`;
      systemHtml += `<tr><th>System Machine ID</th><td><div class="code-block">${data.system.machineId}</div></td></tr>`;
      systemHtml += `<tr><th>Current Cursor Machine ID</th><td><div class="code-block">${data.currentMachineId || 'Not found'}</div></td></tr>`;
      systemHtml += '</table>';
      
      si.innerHTML = systemHtml;
      
      let cursorHtml = '<table>';
      if (data.cursor.isInstalled) {
        const statusIndicator = data.cursor.isRunning ? 
          '<span class="status-indicator status-running"></span>Running' : 
          '<span class="status-indicator status-stopped"></span>Stopped';
        
        cursorHtml += `<tr><th>Status</th><td>${statusIndicator}</td></tr>`;
        cursorHtml += `<tr><th>Path</th><td><div class="code-block">${data.cursor.path}</div></td></tr>`;
        cursorHtml += `<tr><th>Version</th><td>${data.cursor.version || 'Unknown'}</td></tr>`;
      } else {
        cursorHtml += `<tr><td colspan="2">Cursor is not installed on this system</td></tr>`;
      }
      cursorHtml += '</table>';
      
      if (data.cursor.isRunning) {
        cursorHtml += `
          <div class="alert alert-warning">
            <i class="ri-alert-line"></i>
            <strong>Warning:</strong> Cursor is currently running. Please close it before using any features.
          </div>
        `;
      }
      
      cs.innerHTML = cursorHtml;
      
      rb.disabled = data.cursor.isRunning;
      bp.disabled = data.cursor.isRunning;
      du.disabled = data.cursor.isRunning;
      pc.disabled = data.cursor.isRunning;
      
      setTimeout(cb, 100);
    } catch (error) {
      si.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
      cs.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    }
  };
  
  const cb = () => {
    const codeBlocks = document.querySelectorAll('.code-block');
    codeBlocks.forEach(block => {
      block.style.height = 'auto';
      if (block.scrollHeight > block.clientHeight) {
        block.style.minHeight = Math.min(block.scrollHeight, 200) + 'px';
      }
    });
  };
  
  const rm = async () => {
    try {
      rb.disabled = true;
      rr.innerHTML = `
        <div class="processing">
          <p><i class="ri-loader-2-line ri-spin"></i>Resetting machine ID... Please wait</p>
        </div>
      `;
      
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Machine ID has been reset.</p>
            ${result.formatted ? `<pre class="log-output">${result.formatted}</pre>` : ''}
            ${!result.formatted ? `
              <p>New Machine IDs:</p>
              <table class="result-table">
                <tr><th>telemetry.devDeviceId</th><td>${result.newIds?.uuid || 'Generated'}</td></tr>
                <tr><th>telemetry.macMachineId</th><td>${result.newIds?.macMachineId || 'Generated'}</td></tr>
                <tr><th>telemetry.machineId</th><td>${result.newIds?.machineId || 'Generated'}</td></tr>
                <tr><th>telemetry.sqmId</th><td>${result.newIds?.sqmId || 'Generated'}</td></tr>
                <tr><th>storage.serviceMachineId</th><td>${result.newIds?.uuid || 'Generated'}</td></tr>
              </table>
            ` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to reset machine ID</strong></p>
            ${result.formatted ? `<pre class="log-output">${result.formatted}</pre>` : ''}
            ${result.error ? `<p>Error: ${result.error}</p>` : ''}
          </div>
        `;
      }
      
      await gs();
      setTimeout(cb, 100);
    } catch (error) {
      rr.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    } finally {
      rb.disabled = false;
    }
  };
  
  const bk = async () => {
    try {
      bp.disabled = true;
      rr.innerHTML = `
        <div class="processing">
          <p><i class="ri-loader-2-line ri-spin"></i>Bypassing token limit... Please wait</p>
        </div>
      `;
      
      const response = await fetch('/api/bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Token limit has been bypassed.</p>
            ${result.formatted ? `<pre class="log-output">${result.formatted}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to bypass token limit</strong></p>
            ${result.formatted ? `<pre class="log-output">${result.formatted}</pre>` : result.errors?.map(err => `<p>${err}</p>`).join('')}
            ${result.error ? `<p>${result.error}</p>` : ''}
          </div>
        `;
      }
      
      await gs();
    } catch (error) {
      rr.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    } finally {
      bp.disabled = false;
    }
  };
  
  const dz = async () => {
    try {
      du.disabled = true;
      rr.innerHTML = `
        <div class="processing">
          <p><i class="ri-loader-2-line ri-spin"></i>Disabling auto-update... Please wait</p>
        </div>
      `;
      
      const response = await fetch('/api/disable-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Auto-update has been disabled.</p>
            ${result.formatted ? `<pre class="log-output">${result.formatted}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to disable auto-update</strong></p>
            ${result.formatted ? `<pre class="log-output">${result.formatted}</pre>` : result.errors?.map(err => `<p>${err}</p>`).join('')}
            ${result.error ? `<p>${result.error}</p>` : ''}
          </div>
        `;
      }
      
      await gs();
    } catch (error) {
      rr.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    } finally {
      du.disabled = false;
    }
  };
  
  const pt = async () => {
    try {
      pc.disabled = true;
      rr.innerHTML = `
        <div class="processing">
          <p><i class="ri-loader-2-line ri-spin"></i>Converting to Pro features... Please wait</p>
        </div>
      `;
      
      const response = await fetch('/api/pro-convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Pro features have been activated.</p>
            ${result.formatted ? `<pre class="log-output">${result.formatted}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to activate Pro features</strong></p>
            ${result.formatted ? `<pre class="log-output">${result.formatted}</pre>` : result.errors?.map(err => `<p>${err}</p>`).join('')}
            ${result.error ? `<p>${result.error}</p>` : ''}
          </div>
        `;
      }
      
      await gs();
    } catch (error) {
      rr.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    } finally {
      pc.disabled = false;
    }
  };
  
  const ta = () => {
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    accordionItems.forEach(item => {
      const header = item.querySelector('.accordion-header');
      
      header.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        accordionItems.forEach(accItem => {
          accItem.classList.remove('active');
        });
        
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  };
  
  const tl = () => {
    const items = document.querySelectorAll('.timeline-item');
    items.forEach(item => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });
  };
  
  const td = () => {
    const vh = document.querySelectorAll('.version-header');
    vh.forEach(header => {
      header.style.display = 'flex';
      if (window.innerWidth <= 768) {
        header.style.flexDirection = 'column';
      } else {
        header.style.flexDirection = 'row';
      }
    });
  };
  
  const pl = () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading';
    si.innerHTML = loadingDiv.outerHTML;
    cs.innerHTML = loadingDiv.outerHTML;
  };
  
  const ib = () => {
    const donateBtn = document.querySelector('.donate-btn');
    if (donateBtn) {
      donateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://sociabuzz.com/sazumi/tribe', '_blank');
      });
    }
  };
  
  pl();
  gs();
  rb.addEventListener('click', rm);
  bp.addEventListener('click', bk);
  du.addEventListener('click', dz);
  pc.addEventListener('click', pt);
  
  setTimeout(() => {
    ta();
    ib();
    cb();
    sd();
    tl();
    td();
  }, 500);
}); 
