class CharacterCardParser {
    constructor() {
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.parseButton = document.getElementById('parseButton');
        this.resultSection = document.getElementById('resultSection');
        this.resultStatus = document.getElementById('resultStatus');
        this.resultContent = document.getElementById('resultContent');
        this.urlInput = document.getElementById('urlInput');
        this.parseUrlButton = document.getElementById('parseUrlButton');
    }

    bindEvents() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.fileInput.click();
            }
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.parseButton.addEventListener('click', () => this.parseCharacterCard());

        // URL解析按钮
        this.parseUrlButton.addEventListener('click', () => this.parseFromUrl());

        // URL输入框回车事件
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.parseFromUrl();
            }
        });

        // 拖拽事件
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Tab切换事件
        this.bindTabEvents();


        // 键盘快捷键
        this.bindKeyboardShortcuts();
    }

    bindTabEvents() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // 移除所有active类和aria-selected
                tabButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                tabContents.forEach(content => content.classList.remove('active'));
                
                // 添加active类到当前按钮和对应内容
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');
                document.getElementById(targetTab + 'Tab').classList.add('active');
            });

            // 键盘导航支持
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const currentIndex = Array.from(tabButtons).indexOf(button);
                    const nextIndex = e.key === 'ArrowLeft' 
                        ? (currentIndex - 1 + tabButtons.length) % tabButtons.length
                        : (currentIndex + 1) % tabButtons.length;
                    tabButtons[nextIndex].focus();
                }
            });
        });
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+V 粘贴URL
            if (e.ctrlKey && e.key === 'v') {
                const activeTab = document.querySelector('.tab-button.active');
                if (activeTab && activeTab.getAttribute('data-tab') === 'url') {
                    setTimeout(() => {
                        if (this.urlInput.value.trim()) {
                            this.parseFromUrl();
                        }
                    }, 100);
                }
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file) {
        if (!file.type.startsWith('image/png')) {
            alert('请选择PNG格式的图片文件');
            return;
        }

        this.currentFile = file;
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.fileInfo.classList.add('show');
        this.parseButton.disabled = false;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async parseCharacterCard() {
        if (!this.currentFile) return;

        this.showLoading();
        
        try {
            const arrayBuffer = await this.currentFile.arrayBuffer();
            const characterData = this.extractCharacterData(arrayBuffer);
            
            if (characterData) {
                // 保存原始图片数据用于后续保存
                this.originalImageData = this.currentFile;
                this.originalImageFilename = this.currentFile.name;
                
                this.displayCharacterInfo(characterData);
                this.showSuccess();
            } else {
                this.showError('未找到有效的角色卡数据');
            }
        } catch (error) {
            console.error('解析错误:', error);
            this.showError('解析失败: ' + error.message);
        }
    }

    async parseFromUrl() {
        let url = this.urlInput.value.trim();
        
        if (!url) {
            this.showError('请输入图片URL');
            return;
        }

        // 简单的URL验证
        try {
            new URL(url);
        } catch {
            this.showError('请输入有效的URL');
            return;
        }

        this.showLoading();
        
        try {
            // 使用Pages Functions代理获取图片，带重试机制
            const arrayBuffer = await this.fetchImageWithRetry(url);
            const characterData = this.extractCharacterData(arrayBuffer);
            
            if (characterData) {
                // 保存原始图片数据用于后续保存
                this.originalImageData = new Blob([arrayBuffer], { type: 'image/png' });
                this.originalImageFilename = this.getFilenameFromUrl(url) || 'character.png';
                
                // 创建图片信息对象
                const imageInfo = {
                    url: url,
                    originalUrl: this.urlInput.value.trim(), // 保存原始URL
                    size: arrayBuffer.byteLength,
                    contentType: 'image/png',
                    fileName: this.getFilenameFromUrl(url) || 'character.png',
                    hasCharacterData: true
                };
                
                this.displayCharacterInfo(characterData, imageInfo);
                this.showSuccess();
            } else {
                this.showError('未找到有效的角色卡数据');
            }
        } catch (error) {
            console.error('URL解析错误:', error);
            this.showError('网络错误: ' + error.message);
        }
    }

    extractCharacterData(arrayBuffer) {
        try {
            // 将ArrayBuffer转换为Uint8Array
            const data = new Uint8Array(arrayBuffer);
            
            // 首先尝试使用更简单的方法查找文本块
            const textChunks = this.findTextChunksSimple(data);
            
            if (textChunks.length === 0) {
                // 如果简单方法失败，尝试完整解析
                const textChunks2 = this.extractTextChunks(data);
                if (textChunks2.length === 0) {
                    throw new Error('PNG文件中未找到文本块');
                }
                textChunks.push(...textChunks2);
            }

            console.log('找到的文本块:', textChunks.map(chunk => ({
                keyword: chunk.keyword,
                textLength: chunk.text.length,
                textPreview: chunk.text.substring(0, 50) + '...'
            })));

            // 优先查找V3格式 (ccv3)
            const ccv3Chunk = textChunks.find(chunk => 
                chunk.keyword.toLowerCase() === 'ccv3'
            );
            
            if (ccv3Chunk) {
                console.log('找到V3格式数据');
                const jsonData = this.base64ToUtf8(ccv3Chunk.text);
                console.log('V3 JSON数据预览:', jsonData.substring(0, 200) + '...');
                return JSON.parse(jsonData);
            }

            // 查找V2格式 (chara)
            const charaChunk = textChunks.find(chunk => 
                chunk.keyword.toLowerCase() === 'chara'
            );
            
            if (charaChunk) {
                console.log('找到V2格式数据');
                const jsonData = this.base64ToUtf8(charaChunk.text);
                console.log('V2 JSON数据预览:', jsonData.substring(0, 200) + '...');
                return JSON.parse(jsonData);
            }

            throw new Error('未找到有效的角色卡数据');
        } catch (error) {
            console.error('提取角色数据时出错:', error);
            throw error;
        }
    }

    findTextChunksSimple(data) {
        const chunks = [];
        const dataString = new TextDecoder('latin1').decode(data);
        
        // 查找tEXt块标记
        let pos = 0;
        while (pos < dataString.length) {
            const tEXtPos = dataString.indexOf('tEXt', pos);
            if (tEXtPos === -1) break;
            
            // 向前查找块长度
            const lengthStart = tEXtPos - 4;
            if (lengthStart < 0) {
                pos = tEXtPos + 4;
                continue;
            }
            
            const lengthBytes = data.slice(lengthStart, tEXtPos);
            const length = (lengthBytes[0] << 24) | (lengthBytes[1] << 16) | (lengthBytes[2] << 8) | lengthBytes[3];
            
            if (length > 0 && length < 1000000) { // 合理的长度限制
                const dataStart = tEXtPos + 4;
                const dataEnd = dataStart + length;
                
                if (dataEnd <= data.length) {
                    const chunkData = data.slice(dataStart, dataEnd);
                    
                    // 查找null终止符
                    let nullPos = 0;
                    while (nullPos < chunkData.length && chunkData[nullPos] !== 0) {
                        nullPos++;
                    }
                    
                    if (nullPos < chunkData.length) {
                        const keyword = new TextDecoder('utf-8').decode(chunkData.slice(0, nullPos));
                        const textData = new TextDecoder('utf-8').decode(chunkData.slice(nullPos + 1));
                        
                        chunks.push({
                            keyword: keyword,
                            text: textData
                        });
                    }
                }
            }
            
            pos = tEXtPos + 4;
        }
        
        return chunks;
    }

    extractTextChunks(data) {
        const chunks = [];
        let offset = 8; // 跳过PNG文件头

        while (offset < data.length - 12) {
            // 读取块长度
            const length = this.readUint32(data, offset);
            offset += 4;

            // 读取块类型
            const type = this.readString(data, offset, 4);
            offset += 4;

            // 如果是tEXt块，解析它
            if (type === 'tEXt') {
                // 找到null终止符的位置
                let nullPos = offset;
                while (nullPos < offset + length && data[nullPos] !== 0) {
                    nullPos++;
                }
                
                const keyword = this.readString(data, offset, nullPos - offset);
                const textData = this.readString(data, nullPos + 1, length - (nullPos - offset) - 1);
                
                chunks.push({
                    keyword: keyword,
                    text: textData
                });
                
                offset += length;
            } else {
                // 跳过其他类型的块
                offset += length;
            }
            
            // 跳过CRC
            offset += 4;
        }

        return chunks;
    }

    readUint32(data, offset) {
        return (data[offset] << 24) | 
               (data[offset + 1] << 16) | 
               (data[offset + 2] << 8) | 
               data[offset + 3];
    }

    readString(data, offset, length) {
        let result = '';
        for (let i = 0; i < length; i++) {
            if (data[offset + i] === 0) break; // 遇到null终止符停止
            result += String.fromCharCode(data[offset + i]);
        }
        return result;
    }

    base64ToUtf8(base64) {
        try {
            // 清理Base64字符串，移除可能的空白字符
            const cleanBase64 = base64.replace(/\s/g, '');
            
            if (cleanBase64.length === 0) {
                throw new Error('Base64字符串为空');
            }
            
            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const result = new TextDecoder('utf-8').decode(bytes);
            console.log('Base64解码结果长度:', result.length);
            console.log('Base64解码结果预览:', result.substring(0, 100) + '...');
            
            return result;
        } catch (error) {
            console.error('Base64解码失败:', error);
            console.error('原始Base64数据:', base64.substring(0, 100) + '...');
            throw new Error('Base64解码失败: ' + error.message);
        }
    }

    displayCharacterInfo(characterData, imageInfo = null) {
        const isV3 = characterData.spec === 'chara_card_v3';
        const data = characterData.data || characterData;

        // 确定图片源
        let imageSrc = '';
        if (imageInfo && imageInfo.url) {
            imageSrc = imageInfo.url;
        } else if (this.currentFile) {
            imageSrc = URL.createObjectURL(this.currentFile);
        } else {
            imageSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfmlKDovb3lpLHotKU8L3RleHQ+Cjwvc3ZnPg==';
        }

        let html = `
            <div class="character-info">
                <div class="character-avatar">
                    <img src="${imageSrc}" alt="角色头像" />
                </div>
                
                <div class="character-actions">
                    <button id="saveImageButton" class="parse-button" style="background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%); margin-right: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); font-size: 0.9em;">
                        📥 保存图片
                    </button>
                    <button id="saveJsonButton" class="parse-button" style="background: linear-gradient(135deg, var(--accent-color) 0%, #0891b2 100%); margin-right: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); font-size: 0.9em;">
                        💾 保存JSON
                    </button>
                    <button id="copyJsonButton" class="parse-button" style="background: linear-gradient(135deg, var(--warning-color) 0%, #d97706 100%); padding: var(--spacing-sm) var(--spacing-md); font-size: 0.9em;">
                        📋 复制JSON
                    </button>
                </div>
                
                <div class="character-details">
                    <div class="character-name">${this.escapeHtml(data.name || '未知角色')}</div>
                    
                    <div class="character-field">
                        <div class="field-label">📝 描述</div>
                        <div class="field-value">${this.escapeHtml(data.description || '无描述')}</div>
                    </div>
                    
                    <div class="character-field">
                        <div class="field-label">💬 首条消息</div>
                        <div class="field-value">${this.escapeHtml(data.first_mes || '无首条消息')}</div>
                    </div>
                    
                    ${data.character_book && data.character_book.entries && data.character_book.entries.length > 0 ? `
                    <div class="character-field">
                        <div class="field-label">📚 世界书介绍</div>
                        <div class="field-value">
                            ${data.character_book.entries.map((entry, index) => `
                                <div style="margin-bottom: 15px; padding: 10px; background: rgba(99, 102, 241, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
                                    <div style="font-weight: bold; color: var(--primary-color); margin-bottom: 8px;">
                                        条目 ${index + 1}
                                    </div>
                                    ${entry.keys && entry.keys.length > 0 ? `
                                        <div style="margin-bottom: 5px;">
                                            <strong>关键词:</strong> ${entry.keys.map(key => this.escapeHtml(key)).join(', ')}
                                        </div>
                                    ` : ''}
                                    ${entry.comment ? `
                                        <div style="margin-bottom: 5px;">
                                            <strong>备注:</strong> ${this.escapeHtml(entry.comment)}
                                        </div>
                                    ` : ''}
                                    ${entry.content ? `
                                        <div>
                                            <strong>内容:</strong><br>
                                            <div style="margin-top: 5px; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 0.9em; background: rgba(0,0,0,0.05); padding: 8px; border-radius: 4px;">
                                                ${this.escapeHtml(entry.content)}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="character-field">
                        <div class="field-label">📋 格式版本</div>
                        <div class="field-value">${isV3 ? 'V3 (chara_card_v3)' : 'V2 (chara_card_v2)'}</div>
                    </div>
                </div>
            </div>
        `;

        this.resultContent.innerHTML = html;
        
        // 绑定保存按钮事件
        this.bindSaveEvents(characterData, imageInfo);
        
        // 绑定头像点击事件
        this.bindAvatarClick();
    }


    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        // 显示result-header区域
        const resultHeader = document.querySelector('.result-header');
        if (resultHeader) {
            resultHeader.style.display = 'block';
        }
        
        this.resultContent.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <div>正在解析角色卡...</div>
            </div>
        `;
        this.resultSection.classList.add('show');
    }

    showSuccess(message = '解析成功') {
        // 隐藏result-header区域
        const resultHeader = document.querySelector('.result-header');
        if (resultHeader) {
            resultHeader.style.display = 'none';
        }
        
        this.showToast(message, 'success');
    }

    showToast(message, type = 'success') {
        // 移除现有的toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // 创建新的toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // 显示toast
        setTimeout(() => toast.classList.add('show'), 100);

        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showError(message) {
        // 显示result-header区域
        const resultHeader = document.querySelector('.result-header');
        if (resultHeader) {
            resultHeader.style.display = 'block';
        }
        
        this.resultContent.innerHTML = `
            <div class="error-message">
                <strong>❌ 解析失败</strong><br>
                ${this.escapeHtml(message)}
            </div>
        `;
        this.resultStatus.textContent = '解析失败';
        this.resultStatus.className = 'result-status status-error';
        this.resultSection.classList.add('show');
        this.showToast('解析失败: ' + message, 'error');
    }

    showDetailedError(result) {
        let suggestionsHtml = '';
        if (result.suggestions && result.suggestions.length > 0) {
            suggestionsHtml = `
                <div class="character-field">
                    <div class="field-label">💡 建议</div>
                    <div class="field-value">
                        <ul style="margin: 0; padding-left: 20px;">
                            ${result.suggestions.map(suggestion => `<li>${this.escapeHtml(suggestion)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        this.resultContent.innerHTML = `
            <div class="character-info">
                <div class="character-details" style="grid-column: 1 / -1;">
                    <div class="character-name">❌ 解析失败</div>
                    
                    <div class="character-field">
                        <div class="field-label">错误信息</div>
                        <div class="field-value" style="color: #f44336; font-weight: bold;">
                            ${this.escapeHtml(result.error || '未知错误')}
                        </div>
                    </div>
                    
                    ${result.imageInfo ? `
                    <div class="character-field">
                        <div class="field-label">图片信息</div>
                        <div class="field-value">
                            <strong>URL:</strong> ${this.escapeHtml(result.imageInfo.url || '未知')}<br>
                            <strong>大小:</strong> ${this.formatFileSize(result.imageInfo.size || 0)}<br>
                            <strong>格式:</strong> ${result.imageInfo.contentType || '未知'}<br>
                            <strong>包含角色数据:</strong> ${result.imageInfo.hasCharacterData ? '是' : '否'}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${suggestionsHtml}
                    
                    <div class="character-field">
                        <div class="field-label">📋 如何获取正确的角色卡图片</div>
                        <div class="field-value">
                            1. 从SillyTavern导出角色卡（PNG格式）<br>
                            2. 确保图片包含角色元数据<br>
                            3. 避免使用Discord、微信等平台的图片链接<br>
                            4. 使用原始的角色卡文件<br>
                            5. Discord链接会返回WebP格式，不包含角色数据
                        </div>
                    </div>
                    
                    <div class="character-field">
                        <div class="field-label">🔍 关于Discord图片链接</div>
                        <div class="field-value">
                            <strong>问题:</strong> Discord链接返回WebP格式，不包含角色卡数据<br>
                            <strong>原因:</strong> Discord优化图片以提升加载速度<br>
                            <strong>解决:</strong> 使用从SillyTavern导出的原始PNG文件<br>
                            <strong>注意:</strong> 即使下载时显示PNG，API访问仍返回WebP
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.resultStatus.textContent = '解析失败';
        this.resultStatus.className = 'result-status status-error';
        this.resultSection.classList.add('show');
    }


    bindSaveEvents(characterData, imageInfo) {
        // 保存图片按钮
        const saveImageButton = document.getElementById('saveImageButton');
        if (saveImageButton) {
            saveImageButton.addEventListener('click', () => this.saveImage(characterData, imageInfo));
        }

        // 保存JSON按钮
        const saveJsonButton = document.getElementById('saveJsonButton');
        if (saveJsonButton) {
            saveJsonButton.addEventListener('click', () => this.saveJson(characterData));
        }

        // 复制JSON按钮
        const copyJsonButton = document.getElementById('copyJsonButton');
        if (copyJsonButton) {
            copyJsonButton.addEventListener('click', () => this.copyJson(characterData));
        }
    }

    bindAvatarClick() {
        const avatarImg = document.querySelector('.character-avatar img');
        if (avatarImg) {
            avatarImg.addEventListener('click', () => this.showImageModal(avatarImg.src));
        }
    }

    showImageModal(imageSrc) {
        // 创建模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            cursor: pointer;
        `;

        const img = document.createElement('img');
        img.src = imageSrc;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-xl);
        `;

        modal.appendChild(img);
        document.body.appendChild(modal);

        // 点击关闭
        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    async saveImage(characterData, imageInfo) {
        try {
            let imageBlob;
            let filename = 'character.png';

            // 优先使用解析时保存的原始图片数据
            if (this.originalImageData) {
                imageBlob = this.originalImageData;
                filename = this.originalImageFilename || 'character.png';
            } else if (this.currentFile) {
                // 使用本地文件
                imageBlob = this.currentFile;
                filename = this.currentFile.name;
            } else if (imageInfo && imageInfo.url) {
                // 最后才从URL重新获取图片（可能丢失数据）
                const response = await fetch(imageInfo.url);
                imageBlob = await response.blob();
                filename = this.getFilenameFromUrl(imageInfo.url) || 'character.png';
            } else {
                throw new Error('没有可保存的图片');
            }

            // 创建下载链接
            const url = URL.createObjectURL(imageBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('图片已保存！', 'success');
        } catch (error) {
            console.error('保存图片失败:', error);
            this.showToast('保存图片失败: ' + error.message, 'error');
        }
    }

    saveJson(characterData) {
        try {
            const jsonString = JSON.stringify(characterData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${characterData.data?.name || 'character'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('JSON文件已保存！', 'success');
        } catch (error) {
            console.error('保存JSON失败:', error);
            this.showToast('保存JSON失败: ' + error.message, 'error');
        }
    }

    async copyJson(characterData) {
        try {
            const jsonString = JSON.stringify(characterData, null, 2);
            await navigator.clipboard.writeText(jsonString);
            this.showToast('JSON已复制到剪贴板！', 'success');
        } catch (error) {
            console.error('复制JSON失败:', error);
            // 回退方案
            const textArea = document.createElement('textarea');
            textArea.value = JSON.stringify(characterData, null, 2);
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('JSON已复制到剪贴板！', 'success');
        }
    }

    cleanDiscordUrl(url) {
        try {
            // 检查是否是Discord链接
            if (url.includes('discordapp.net') || url.includes('discord.com')) {
                // 移除从 &format=webp 开始的所有参数
                let cleanUrl = url;
                
                // 查找 &format=webp 的位置，如果找到则截取到该位置之前
                const formatIndex = cleanUrl.indexOf('&format=webp');
                if (formatIndex !== -1) {
                    cleanUrl = cleanUrl.substring(0, formatIndex);
                }
                
                if (cleanUrl !== url) {
                    console.log('清理Discord URL参数:', url, '->', cleanUrl);
                }
                return cleanUrl;
            }
            return url;
        } catch (error) {
            console.warn('URL清理失败，使用原始URL:', error);
            return url;
        }
    }

    getFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            return filename || 'character.png';
        } catch {
            return 'character.png';
        }
    }

    /**
     * 带重试机制的图片获取方法
     */
    async fetchImageWithRetry(url, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`尝试获取图片 (第${attempt}次):`, url);
                
                // 使用Pages Functions代理获取图片
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    cache: 'no-cache',
                    signal: AbortSignal.timeout(30000) // 30秒超时
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                
                // 检查文件大小
                if (arrayBuffer.byteLength === 0) {
                    throw new Error('图片文件为空');
                }
                
                console.log(`图片获取成功 (第${attempt}次):`, arrayBuffer.byteLength, 'bytes');
                return arrayBuffer;
                
            } catch (error) {
                lastError = error;
                console.warn(`第${attempt}次尝试失败:`, error.message);
                
                // 如果不是最后一次尝试，等待后重试
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt - 1) * 1000; // 指数退避: 1s, 2s, 4s
                    console.log(`等待 ${delay}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // 所有重试都失败了
        throw new Error(`图片获取失败 (已重试${maxRetries}次): ${lastError.message}`);
    }
}

// 初始化解析器
document.addEventListener('DOMContentLoaded', () => {
    new CharacterCardParser();
});
