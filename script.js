// ==== APIサーバーURL設定 ====
// 例: Netlifyで公開時は https://xxxx.trycloudflare.com などに書き換え
const API_BASE = window.API_BASE_URL || 'https://simply-sought-familiar-liability.trycloudflare.com';

function apiFetch(path, options = {}) {
    options.credentials = 'include'; // Cookie送信
    return fetch(API_BASE + path, options);
}

document.addEventListener('DOMContentLoaded', function() {
    // UI要素取得
    const loginArea = document.getElementById('login-area');
    const mainArea = document.getElementById('main-area');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const uploadForm = document.getElementById('upload-form');
    const uploadMsg = document.getElementById('upload-msg');
    const galleryList = document.getElementById('gallery-list');
    const searchInput = document.getElementById('search-input');
    const accountName = document.getElementById('account-name');
        // const dashboardBtn = document.getElementById('dashboard-btn');
        // const dashboardModal = document.getElementById('dashboard-modal');
    const accountIcon = document.getElementById('account-icon');
    const accountModal = document.getElementById('account-modal');
    const header = document.querySelector('.header');

    // 初期状態でヘッダー非表示
    header.style.display = 'none';

    let isAdmin = false;
    let currentUser = null;
    let allFiles = [];
    let myUploads = [];
    let viewHistory = [];
    let dlHistory = [];

    // ログイン状態確認
    function checkLogin() {
        apiFetch('/files').then(res => res.json()).then(data => {
            if (data.success) {
                apiFetch('/whoami').then(r => r.json()).then(u => {
                    isAdmin = u.user === 'admin';
                    currentUser = u.user;
                    // ユーザーごとに履歴を切り替え
                    viewHistory = JSON.parse(localStorage.getItem('viewHistory_' + currentUser) || '[]');
                    dlHistory = JSON.parse(localStorage.getItem('dlHistory_' + currentUser) || '[]');
                    accountName.textContent = currentUser;
                    loginArea.style.display = 'none';
                    mainArea.style.display = '';
                    header.style.display = '';
                    loadFiles();
                    // myUploadsはloadFilesで更新
                    // アカウントアイコンのイベントバインド（ログイン後のみ）
                    const accountIcon = document.getElementById('account-icon');
                    const accountModal = document.getElementById('account-modal');
                    if (accountIcon && accountModal) {
                        accountIcon.onclick = function() {
                            let html = `<div>`;
                            html += `<div class='upload-section-modal'>
                                <h2>ファイルアップロード</h2>
                                <form id='upload-form-modal'>
                                    <input type='text' id='title-modal' placeholder='タイトル' required>
                                    <input type='file' id='file-modal' required>
                                    <button type='submit'>アップロード</button>
                                </form>
                                <div id='upload-msg-modal'></div>
                            </div>`;
                            html += `<div class='dashboard-section'>`;
                            html += `<h2>ダッシュボード</h2>`;
                            html += `<h3>自分のアップロード</h3><ul>`;
                            myUploads.forEach(f => {
                                html += `<li>${escapeHtml(f.title)}</li>`;
                            });
                            html += `</ul>`;
                            if (isAdmin) {
                                html += `<h3>全ファイル管理（管理者）</h3><ul id='admin-file-list'>`;
                                allFiles.forEach(f => {
                                    html += `<li>${escapeHtml(f.title)} <button class='admin-del-btn' data-fn='${encodeURIComponent(f.filename)}'>削除</button></li>`;
                                });
                                html += `</ul>`;
                            }
                            html += `<h3>閲覧履歴</h3><ul>`;
                            viewHistory.forEach(f => {
                                html += `<li>${escapeHtml(f.title)}</li>`;
                            });
                            html += `</ul><h3>ダウンロード履歴</h3><ul>`;
                            dlHistory.forEach(f => {
                                html += `<li>${escapeHtml(f.title)}</li>`;
                            });
                            html += `</ul>`;
                            html += `</div>`;
                            html += `<button onclick='document.getElementById("account-modal").style.display="none"'>閉じる</button>`;
                            html += `</div>`;
                            accountModal.innerHTML = html;
                            accountModal.style.display = '';

                            // 管理者削除ボタンのイベント
                            if (isAdmin) {
                                const adminDelBtns = accountModal.querySelectorAll('.admin-del-btn');
                                adminDelBtns.forEach(btn => {
                                    btn.onclick = function() {
                                        const fn = decodeURIComponent(btn.getAttribute('data-fn'));
                                        if (confirm('本当に削除しますか？')) {
                                            apiFetch('/delete/' + encodeURIComponent(fn), {method: 'POST'})
                                                .then(res => res.json())
                                                .then(data => {
                                                    if (data.success) {
                                                        loadFiles();
                                                        // モーダルを再表示してリスト更新
                                                        accountIcon.click();
                                                    } else {
                                                        alert(data.error || '削除失敗');
                                                    }
                                                });
                                        }
                                    };
                                });
                            }

                            // モーダル内アップロードフォームの動作
                            const uploadFormModal = document.getElementById('upload-form-modal');
                            const uploadMsgModal = document.getElementById('upload-msg-modal');
                            if (uploadFormModal) {
                                uploadFormModal.onsubmit = function(e) {
                                    e.preventDefault();
                                    uploadMsgModal.textContent = '';
                                    const formData = new FormData();
                                    formData.append('title', document.getElementById('title-modal').value);
                                    formData.append('file', document.getElementById('file-modal').files[0]);
                                    apiFetch('/upload', {
                                        method: 'POST',
                                        body: formData
                                    }).then(res => res.json()).then(data => {
                                        if (data.success) {
                                            uploadMsgModal.textContent = 'アップロード成功';
                                            uploadFormModal.reset();
                                            loadFiles();
                                        } else {
                                            uploadMsgModal.textContent = data.error || 'アップロード失敗';
                                        }
                                    });
                                };
                            }
                        };
                    }
                });
            } else {
                loginArea.style.display = '';
                mainArea.style.display = 'none';
                header.style.display = 'none';
            }
        });
    }

    // ログイン
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            e.preventDefault();
            loginError.textContent = '';
            apiFetch('/login', {
                method: 'POST',
                body: new URLSearchParams({
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    checkLogin();
                } else {
                    loginError.textContent = data.error || 'ログイン失敗';
                }
            });
        };
    }

    // ログアウト
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            apiFetch('/logout', {method: 'POST'}).then(() => {
                checkLogin();
            });
        };
    }

    // アップロード
    if (uploadForm) {
        uploadForm.onsubmit = function(e) {
            e.preventDefault();
            uploadMsg.textContent = '';
            const formData = new FormData();
            formData.append('title', document.getElementById('title').value);
            formData.append('file', document.getElementById('file').files[0]);
            apiFetch('/upload', {
                method: 'POST',
                body: formData
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    uploadMsg.textContent = 'アップロード成功';
                    uploadForm.reset();
                    loadFiles();
                } else {
                    uploadMsg.textContent = data.error || 'アップロード失敗';
                }
            });
        };
    }

    // ファイル一覧取得
    function loadFiles() {
        apiFetch('/files').then(res => res.json()).then(data => {
            if (data.success) {
                allFiles = data.files;
                // myUploadsもここで更新
                myUploads = allFiles.filter(f => f.uploader === currentUser);
                renderGallery(allFiles);
            }
        });
    }

    // ギャラリー表示
    function renderGallery(files) {
        galleryList.innerHTML = '';
        // 最大8個横並び
        const showFiles = files.slice(0, 32); // 4行分
        showFiles.forEach(f => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            // サムネイル
            let thumb = '';
            const ext = f.filename.split('.').pop().toLowerCase();
            if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) {
                thumb = `<img class='gallery-thumb' src='${API_BASE}/view/${encodeURIComponent(f.filename)}'>`;
            } else if (["mp4","webm","mov","avi"].includes(ext)) {
                thumb = `<video class='gallery-thumb' src='${API_BASE}/view/${encodeURIComponent(f.filename)}' controls muted></video>`;
            } else if (["txt","md","log","py","js","json","csv"].includes(ext)) {
                thumb = `<div class='gallery-thumb' style='display:flex;align-items:center;justify-content:center;font-size:2rem;color:#888;'>TXT</div>`;
            } else {
                thumb = `<div class='gallery-thumb' style='display:flex;align-items:center;justify-content:center;font-size:2rem;color:#888;'>?</div>`;
            }
            let btns = `<button data-fn="${encodeURIComponent(f.filename)}" data-act="dl">DL</button>`;
            if (isAdmin) {
                btns += ` <button data-fn="${encodeURIComponent(f.filename)}" data-act="del" style="background:#e53935;">削除</button>`;
            }
            item.innerHTML = `
                ${thumb}
                <div class='gallery-title'>${escapeHtml(f.title)}</div>
                <div class='gallery-btns'>
                    ${btns}
                </div>
            `;
            // DL履歴記録
            item.querySelector('button[data-act="dl"]').onclick = function() {
                window.open(API_BASE + '/download/' + encodeURIComponent(f.filename), '_blank');
                addHistory('dl', f);
            };
            // サムネイルクリックでプレビュー
            item.querySelector('.gallery-thumb').onclick = function() {
                previewFile(f);
                addHistory('view', f);
            };
            // 管理者削除ボタン
            if (isAdmin) {
                const delBtn = item.querySelector('button[data-act="del"]');
                if (delBtn) {
                    delBtn.onclick = function() {
                        if (confirm('本当に削除しますか？')) {
                            // 先にUIから消す
                            item.remove();
                            apiFetch('/delete/' + encodeURIComponent(f.filename), {method: 'POST'})
                                .then(res => res.json())
                                .then(data => {
                                    if (!data.success) {
                                        alert(data.error || '削除失敗');
                                        // 失敗時は再描画
                                        loadFiles();
                                    }
                                });
                        }
                    };
                }
            }
            galleryList.appendChild(item);
        });
    }

    // プレビュー
    function previewFile(f) {
        const ext = f.filename.split('.').pop().toLowerCase();
        let modalCheckTimer = null;
        function startCheckDeleted() {
            // 1秒ごとにファイル存在チェック
            modalCheckTimer = setInterval(() => {
                apiFetch('/view/' + encodeURIComponent(f.filename)).then(r => r.json()).then(data => {
                    if (!data.success) {
                        // モーダルを閉じて警告
                        const modal = document.getElementById('preview-modal');
                        if (modal) modal.remove();
                        alert('このファイルは削除されました');
                        clearInterval(modalCheckTimer);
                    }
                });
            }, 1000);
        }
        function stopCheckDeleted() {
            if (modalCheckTimer) clearInterval(modalCheckTimer);
        }
        // モーダルを開く
        let html = '';
        if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) {
            html = `<img src='${API_BASE}/view/${encodeURIComponent(f.filename)}' style='max-width:90vw;max-height:70vh;'>`;
        } else if (["mp4","webm","mov","avi"].includes(ext)) {
            html = `<video src='${API_BASE}/view/${encodeURIComponent(f.filename)}' controls style='max-width:90vw;max-height:70vh;'></video>`;
        }
        if (html) {
            showModal(html);
            startCheckDeleted();
            // モーダル閉じたら監視停止
            setTimeout(() => {
                const modal = document.getElementById('preview-modal');
                if (modal) {
                    modal.addEventListener('click', stopCheckDeleted);
                }
            }, 100);
        } else {
            apiFetch('/view/' + encodeURIComponent(f.filename)).then(r => r.json()).then(data => {
                if (data.success && data.type === 'text') {
                    showModal(`<pre style='max-width:90vw;max-height:70vh;overflow:auto;'>${escapeHtml(data.content)}</pre>`);
                    startCheckDeleted();
                    setTimeout(() => {
                        const modal = document.getElementById('preview-modal');
                        if (modal) {
                            modal.addEventListener('click', stopCheckDeleted);
                        }
                    }, 100);
                } else {
                    showModal(data.error || 'プレビューできません');
                }
            });
        }
    }

    // 検索
    // 検索実行関数
    function doSearch() {
        const q = searchInput.value.trim();
        if (!q) {
            renderGallery(allFiles);
        } else {
            renderGallery(allFiles.filter(f => f.title.includes(q)));
        }
    }
    searchInput.addEventListener('input', doSearch);
    // エンターキーで検索
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            doSearch();
        }
    });
    // 虫眼鏡ボタンで検索
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            doSearch();
        });
    }

    // 履歴管理
    function addHistory(type, f) {
        if (!currentUser) return;
        let key = (type === 'dl' ? 'dlHistory_' : 'viewHistory_') + currentUser;
        let arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.unshift({title: f.title, filename: f.filename, time: Date.now()});
        arr = arr.slice(0, 30);
        localStorage.setItem(key, JSON.stringify(arr));
        // メモリ上の履歴も更新
        if (type === 'dl') dlHistory = arr;
        else viewHistory = arr;
    }

    // dashboardBtnは現状UIに存在しないため、関連コードを完全削除

    // アカウントアイコンでモーダル表示
    if (accountIcon) {
        accountIcon.onclick = function() {
            let html = `<div>`;
            html += `<div class='upload-section-modal'>
                <h2>ファイルアップロード</h2>
                <form id='upload-form-modal'>
                    <input type='text' id='title-modal' placeholder='タイトル' required>
                    <input type='file' id='file-modal' required>
                    <button type='submit'>アップロード</button>
                </form>
                <div id='upload-msg-modal'></div>
            </div>`;
            html += `<div class='dashboard-section'>`;
            html += `<h2>ダッシュボード</h2>`;
            html += `<h3>自分のアップロード</h3><ul>`;
            myUploads.forEach(f => {
                html += `<li>${escapeHtml(f.title)}</li>`;
            });
            html += `</ul><h3>閲覧履歴</h3><ul>`;
            viewHistory.forEach(f => {
                html += `<li>${escapeHtml(f.title)}</li>`;
            });
            html += `</ul><h3>ダウンロード履歴</h3><ul>`;
            dlHistory.forEach(f => {
                html += `<li>${escapeHtml(f.title)}</li>`;
            });
            html += `</ul>`;
            html += `</div>`;
            html += `<button onclick='document.getElementById("account-modal").style.display="none"'>閉じる</button>`;
            html += `</div>`;
            accountModal.innerHTML = html;
            accountModal.style.display = '';

            // モーダル内アップロードフォームの動作
            const uploadFormModal = document.getElementById('upload-form-modal');
            const uploadMsgModal = document.getElementById('upload-msg-modal');
            if (uploadFormModal) {
                uploadFormModal.onsubmit = function(e) {
                    e.preventDefault();
                    uploadMsgModal.textContent = '';
                    const formData = new FormData();
                    formData.append('title', document.getElementById('title-modal').value);
                    formData.append('file', document.getElementById('file-modal').files[0]);
                    apiFetch('/upload', {
                        method: 'POST',
                        body: formData
                    }).then(res => res.json()).then(data => {
                        if (data.success) {
                            uploadMsgModal.textContent = 'アップロード成功';
                            uploadFormModal.reset();
                            loadFiles();
                        } else {
                            uploadMsgModal.textContent = data.error || 'アップロード失敗';
                        }
                    });
                };
            }
        };

    // モーダル
    function showModal(html) {
        let modal = document.getElementById('preview-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'preview-modal';
            modal.style.position = 'fixed';
            modal.style.left = '0';
            modal.style.top = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.7)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '9999';
            modal.onclick = function() { modal.remove(); };
            document.body.appendChild(modal);
        }
        modal.innerHTML = `<div style='background:#fff;padding:24px;border-radius:8px;max-width:95vw;max-height:80vh;overflow:auto;position:relative;'>${html}<br><button style='position:absolute;top:8px;right:8px;' onclick='this.closest("#preview-modal").remove()'>閉じる</button></div>`;
    }
    }

    // HTMLエスケープ
    function escapeHtml(str) {
        return str.replace(/[&<>'"]/g, function(c) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[c];
        });
    }

    // 登録フォーム
    const registerForm = document.getElementById('register-form');
    const registerMsg = document.getElementById('register-msg');
    if (registerForm) {
        registerForm.onsubmit = function(e) {
            e.preventDefault();
            registerMsg.textContent = '';
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            apiFetch('/register', {
                method: 'POST',
                body: new URLSearchParams({username, password})
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    registerMsg.style.color = 'green';
                    registerMsg.textContent = '登録成功！ログインしてください';
                    registerForm.reset();
                } else {
                    registerMsg.style.color = 'red';
                    registerMsg.textContent = data.error || '登録失敗';
                }
            }).catch(() => {
                registerMsg.style.color = 'red';
                registerMsg.textContent = '登録失敗';
            });
            // return false; // 不要なので削除
        };
    }

    // --- 自動ログイン判定（ページロード時） ---
    checkLogin();
});
