// ==== APIサーバーURL設定 ====
// 例: Netlifyで公開時は https://xxxx.trycloudflare.com などに書き換え
const API_BASE = window.API_BASE_URL || 'https://caught-cheats-sentences-salem.trycloudflare.com/';

function apiFetch(path, options = {}) {
    options.credentials = 'include'; // Cookie送信
    return fetch(API_BASE + path, options);
}

document.addEventListener('DOMContentLoaded', function() {
	const loginArea = document.getElementById('login-area');
	const mainArea = document.getElementById('main-area');
	const loginForm = document.getElementById('login-form');
	const loginError = document.getElementById('login-error');
	const logoutBtn = document.getElementById('logout-btn');
	const uploadForm = document.getElementById('upload-form');
	const uploadMsg = document.getElementById('upload-msg');
	const fileList = document.getElementById('file-list').getElementsByTagName('tbody')[0];
	const searchInput = document.createElement('input');
	searchInput.type = 'text';
	searchInput.placeholder = 'タイトル検索';
	searchInput.style.margin = '8px 0';
	mainArea.insertBefore(searchInput, fileList.parentElement);

	let isAdmin = false;

	// ログイン状態確認
	function checkLogin() {
		apiFetch('/files').then(res => res.json()).then(data => {
			if (data.success) {
				// 管理者判定
				apiFetch('/whoami').then(r => r.json()).then(u => {
					isAdmin = u.user === 'admin';
					loginArea.style.display = 'none';
					mainArea.style.display = '';
					loadFiles();
				});
			} else {
				loginArea.style.display = '';
				mainArea.style.display = 'none';
			}
		});
	}

	// ログイン
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

	// ログアウト
	logoutBtn.onclick = function() {
		apiFetch('/logout', {method: 'POST'}).then(() => {
			checkLogin();
		});
	};

	// アップロード
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

	// ファイル一覧取得
	let allFiles = [];
	function loadFiles() {
		apiFetch('/files').then(res => res.json()).then(data => {
			if (data.success) {
				allFiles = data.files;
				renderFiles(allFiles);
			}
		});
	}

	// ファイル一覧表示
	function renderFiles(files) {
		fileList.innerHTML = '';
		files.forEach(f => {
			const tr = document.createElement('tr');
			let btns = `<button data-fn="${encodeURIComponent(f.filename)}" data-act="dl">DL</button>`;
			if (isAdmin) {
				btns += ` <button data-fn="${encodeURIComponent(f.filename)}" data-act="view">閲覧</button> <button data-fn="${encodeURIComponent(f.filename)}" data-act="del">削除</button>`;
			}
			tr.innerHTML = `<td>${escapeHtml(f.title)}</td><td>${escapeHtml(f.filename)}</td><td>${btns}</td>`;
			fileList.appendChild(tr);
		});
	}

	// ボタン操作
	fileList.onclick = function(e) {
		if (e.target.tagName === 'BUTTON') {
			const fn = e.target.getAttribute('data-fn');
			const act = e.target.getAttribute('data-act');
			if (act === 'dl') {
				window.open(API_BASE + '/download/' + fn, '_blank');
			} else if (act === 'view') {
				apiFetch('/view/' + fn).then(r => r.json()).then(data => {
					if (data.success) {
						if (data.type === 'text') {
							alert('内容:\n' + data.content);
						} else {
							window.open(API_BASE + '/view/' + fn, '_blank');
						}
					} else {
						alert(data.error || '閲覧できません');
					}
				});
			} else if (act === 'del') {
				if (confirm('本当に削除しますか？')) {
					apiFetch('/delete/' + fn, {method: 'POST'}).then(r => r.json()).then(data => {
						if (data.success) {
							loadFiles();
						} else {
							alert(data.error || '削除できません');
						}
					});
				}
			}
		}
	};

	// 検索
	searchInput.addEventListener('input', function() {
		const q = searchInput.value.trim();
		if (!q) {
			renderFiles(allFiles);
		} else {
			renderFiles(allFiles.filter(f => f.title.includes(q)));
		}
	});

	// HTMLエスケープ
	function escapeHtml(str) {
		return str.replace(/[&<>'"]/g, function(c) {
			return {'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[c];
		});
	}

	checkLogin();
});
