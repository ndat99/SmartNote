// ════════════════════════════════════════
//  IMAGE UPLOAD & RENDER IN MODAL
// ════════════════════════════════════════
function _renderModalImages(images) {
    const container = document.getElementById('modalImageSlider');
    container.innerHTML = '';
    
    // Lưu lại dataset
    container.dataset.images = JSON.stringify(images);

    if (!images || images.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    if (images.length <= 2) {
        container.classList.remove('slider-mode');
        container.classList.add('grid-mode');
        images.forEach(img => {
            const div = document.createElement('div');
            div.className = 'modal-img-wrap';
            div.innerHTML = `
                <img src="${img.url}">
                <button class="delete-img-btn" onclick="deleteModalImage(${img.id}, event)"><i class="ph ph-trash"></i></button>
            `;
            container.appendChild(div);
        });
    } else {
        container.classList.remove('grid-mode');
        container.classList.add('slider-mode');
        
        images.forEach(img => {
            const div = document.createElement('div');
            div.className = 'modal-img-slide';
            div.innerHTML = `
                <img src="${img.url}">
                <button class="delete-img-btn" onclick="deleteModalImage(${img.id}, event)"><i class="ph ph-trash"></i></button>
            `;
            container.appendChild(div);
        });
    }
}

async function uploadModalImages(input) {
    const files = input.files;
    if (!files || files.length === 0) return;
    
    const noteId = document.querySelector('.keep-modal-content').getAttribute('data-note-id');
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }
    
    try {
        const res = await fetch(`/image/add/${noteId}/`, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': _csrf() }
        });
        const data = await res.json();
        if (data.ok) {
            const container = document.getElementById('modalImageSlider');
            let images = JSON.parse(container.dataset.images || '[]');
            images = images.concat(data.images);
            _renderModalImages(images);
            _syncCardImages(noteId, images);
        }
    } catch (e) {
        console.error('Lỗi upload ảnh', e);
    }
    input.value = ''; // Reset
}

async function deleteModalImage(imageId, event) {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;
    
    try {
        const res = await fetch(`/image/delete/${imageId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': _csrf() }
        });
        const data = await res.json();
        if (data.ok) {
            const noteId = document.querySelector('.keep-modal-content').getAttribute('data-note-id');
            const container = document.getElementById('modalImageSlider');
            let images = JSON.parse(container.dataset.images || '[]');
            images = images.filter(img => img.id !== imageId);
            _renderModalImages(images);
            _syncCardImages(noteId, images);
        }
    } catch (e) {
        console.error('Lỗi xóa ảnh', e);
    }
}

function _syncCardImages(noteId, images) {
    const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
    if (!card) return;
    
    let imgContainer = card.querySelector('.note-card-images');
    let scriptEl = card.querySelector('.note-image-data');
    
    if (!images || images.length === 0) {
        if (imgContainer) imgContainer.remove();
        if (scriptEl) scriptEl.remove();
        return;
    }
    
    // Update data script
    if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.type = 'application/json';
        scriptEl.className = 'note-image-data';
        const titleEl = card.querySelector('.note-card-title');
        if (titleEl) {
            card.insertBefore(scriptEl, titleEl);
        } else {
            card.appendChild(scriptEl);
        }
    }
    scriptEl.textContent = JSON.stringify(images);
    
    // Update visual stamps
    if (!imgContainer) {
        imgContainer = document.createElement('div');
        imgContainer.className = `note-card-images`;
        card.insertBefore(imgContainer, scriptEl);
    }
    
    imgContainer.className = `note-card-images len-${images.length}`;
    imgContainer.innerHTML = '';
    
    const limit = Math.min(images.length, 3);
    for (let i = 0; i < limit; i++) {
        const wrap = document.createElement('div');
        wrap.className = 'note-card-img-wrap';
        if (i === 2 && images.length > 3) {
            wrap.classList.add('extra-images');
            wrap.innerHTML = `<img src="${images[i].url}" alt="Note Image">
                              <div class="extra-images-overlay">+${images.length - 2}</div>`;
        } else {
            wrap.innerHTML = `<img src="${images[i].url}" alt="Note Image">`;
        }
        imgContainer.appendChild(wrap);
    }
}

