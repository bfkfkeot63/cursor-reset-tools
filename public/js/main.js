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
      const response = await fetch('/api/system-info');
      const data = await response.json();
      
      let systemHtml = '<table>';
      systemHtml += `<tr><th>Platform</th><td>${data.platform}</td></tr>`;
      systemHtml += `<tr><th>OS Release</th><td>${data.release}</td></tr>`;
      systemHtml += `<tr><th>Hostname</th><td>${data.hostname}</td></tr>`;
      
      if (data.machineId) {
        systemHtml += `<tr><th>Current Machine ID</th><td><div class="code-block">${data.machineId}</div></td></tr>`;
      }
      
      systemHtml += `<tr><th>Machine ID Path</th><td><div class="code-block">${data.paths.machineId}</div></td></tr>`;
      systemHtml += `<tr><th>Storage Path</th><td><div class="code-block">${data.paths.storage}</div></td></tr>`;
      systemHtml += `<tr><th>SQLite DB Path</th><td><div class="code-block">${data.paths.sqlite}</div></td></tr>`;
      systemHtml += '</table>';
      
      si.innerHTML = systemHtml;
      
      let cursorHtml = '<table>';
      if (data.cursor && (data.exists.machineId || data.exists.storage || data.exists.sqlite)) {
        const statusIndicator = data.cursor.isRunning ? 
          '<span class="status-indicator status-running"></span>Running' : 
          '<span class="status-indicator status-stopped"></span>Stopped';
          
        cursorHtml += `<tr><th>Status</th><td>${statusIndicator}</td></tr>`;
        cursorHtml += `<tr><th>Path</th><td><div class="code-block">${data.cursor.path}</div></td></tr>`;
        cursorHtml += `<tr><th>Version</th><td>${data.cursor.version || 'Unknown'}</td></tr>`;
        
        cursorHtml += `<tr><th>Machine ID File</th><td>${data.exists.machineId ? 
          '<span class="status-indicator status-running"></span>Found' : 
          '<span class="status-indicator status-stopped"></span>Not Found'}</td></tr>`;
        
        cursorHtml += `<tr><th>Storage File</th><td>${data.exists.storage ? 
          '<span class="status-indicator status-running"></span>Found' : 
          '<span class="status-indicator status-stopped"></span>Not Found'}</td></tr>`;
          
        cursorHtml += `<tr><th>SQLite Database</th><td>${data.exists.sqlite ? 
          '<span class="status-indicator status-running"></span>Found' : 
          '<span class="status-indicator status-stopped"></span>Not Found'}</td></tr>`;
      } else {
        cursorHtml += `<tr><td colspan="2">Cursor is not installed on this system</td></tr>`;
      }
      cursorHtml += '</table>';
      
      if (data.cursor && data.cursor.isRunning) {
        cursorHtml += `
          <div class="alert alert-warning">
            <i class="ri-alert-line"></i>
            <strong>Warning:</strong> Cursor is currently running. Please close it before using any features.
          </div>
        `;
      }
      
      if (!data.exists.machineId && !data.exists.storage && !data.exists.sqlite) {
        cursorHtml += `
          <div class="alert alert-warning">
            <i class="ri-alert-line"></i>
            <strong>Warning:</strong> Cursor files not found. Make sure Cursor is installed properly.
          </div>
        `;
      }
      
      cs.innerHTML = cursorHtml;
      
      rb.disabled = !data.exists.machineId || (data.cursor && data.cursor.isRunning);
      bp.disabled = !data.exists.sqlite || (data.cursor && data.cursor.isRunning);
      du.disabled = !data.exists.storage || (data.cursor && data.cursor.isRunning);
      pc.disabled = !data.exists.sqlite || (data.cursor && data.cursor.isRunning);
      
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
      
      const response = await fetch('/api/reset-machine-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Machine ID has been reset to: ${result.newId || 'New ID'}</p>
            ${result.logs ? `<pre class="log-output">${result.logs}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to reset machine ID</strong></p>
            <p>Error: ${result.message || 'Unknown error'}</p>
            ${result.logs ? `<pre class="log-output">${result.logs}</pre>` : ''}
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
      
      const response = await fetch('/api/reset-token-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Token limit has been reset.</p>
            ${result.logs ? `<pre class="log-output">${result.logs}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to reset token limit</strong></p>
            <p>Error: ${result.message || 'Unknown error'}</p>
            ${result.logs ? `<pre class="log-output">${result.logs}</pre>` : ''}
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
      
      const response = await fetch('/api/disable-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Auto-update has been disabled.</p>
            ${result.logs ? `<pre class="log-output">${result.logs}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to disable auto-update</strong></p>
            <p>Error: ${result.message || 'Unknown error'}</p>
            ${result.logs ? `<pre class="log-output">${result.logs}</pre>` : ''}
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
          <p><i class="ri-loader-2-line ri-spin"></i>Converting to Pro... Please wait</p>
        </div>
      `;
      
      const response = await fetch('/api/enable-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Pro features have been enabled.</p>
            ${result.logs ? `<pre class="log-output">${result.logs}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to enable Pro features</strong></p>
            <p>Error: ${result.message || 'Unknown error'}</p>
            ${result.logs ? `<pre class="log-output">${result.logs}</pre>` : ''}
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

function copyToClipboard(e) {
  const targetId = e.currentTarget.dataset.target;
  const textToCopy = document.getElementById(targetId).textContent;
  const textArea = document.createElement('textarea');
  
  textArea.value = textToCopy;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  
  const originalHtml = e.currentTarget.innerHTML;
  e.currentTarget.innerHTML = '<i class="ri-check-line"></i>';
  document.getElementById(targetId).classList.add('copied');
  
  setTimeout(() => {
    e.currentTarget.innerHTML = originalHtml;
    document.getElementById(targetId).classList.remove('copied');
  }, 1500);
}

function showToast(message, type = 'info') {
  const toastContainer = document.querySelector('.toast-container') || (() => {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  })();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  toast.innerHTML = `
    <div class="toast-content">
      <i class="ri-${type === 'success' ? 'check-line' : type === 'error' ? 'error-warning-line' : type === 'warning' ? 'alert-line' : 'information-line'}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close"><i class="ri-close-line"></i></button>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-closing');
    setTimeout(() => {
      toast.remove();
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, 5000);
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('toast-closing');
    setTimeout(() => {
      toast.remove();
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  });
} 
