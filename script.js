class GreenAPI {
    constructor() {
        this.baseUrl = 'https://api.green-api.com';
        this.demoMode = false;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.idInstanceInput = document.getElementById('idInstance');
        this.apiTokenInstanceInput = document.getElementById('apiTokenInstance');
        this.phoneNumberInput = document.getElementById('phoneNumber');
        this.messageTextInput = document.getElementById('messageText');
        this.fileUrlInput = document.getElementById('fileUrl');
        this.filePhoneInput = document.getElementById('filePhone');
        this.responseContent = document.getElementById('responseContent');
        this.qrCodeImage = document.getElementById('qrCodeImage');
        this.toggleTokenBtn = document.getElementById('toggleToken');
        
        this.getSettingsBtn = document.getElementById('getSettingsBtn');
        this.getStateInstanceBtn = document.getElementById('getStateInstanceBtn');
        this.getQRCodeBtn = document.getElementById('getQRCodeBtn');
        this.sendMessageBtn = document.getElementById('sendMessageBtn');
        this.sendFileByUrlBtn = document.getElementById('sendFileByUrlBtn');
    }

    bindEvents() {
        this.getSettingsBtn.addEventListener('click', () => this.getSettings());
        this.getStateInstanceBtn.addEventListener('click', () => this.getStateInstance());
        this.getQRCodeBtn.addEventListener('click', () => this.getQRCode());
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.sendFileByUrlBtn.addEventListener('click', () => this.sendFileByUrl());
        
        // Add demo mode toggle
        this.idInstanceInput.addEventListener('input', () => this.checkDemoMode());
        this.apiTokenInstanceInput.addEventListener('input', () => this.checkDemoMode());
        
        // Add password toggle
        this.toggleTokenBtn.addEventListener('click', () => this.toggleTokenVisibility());
    }

    checkDemoMode() {
        // Enable demo mode if fields contain "demo"
        if (this.idInstanceInput.value.includes('demo') || 
            this.apiTokenInstanceInput.value.includes('demo')) {
            this.demoMode = true;
            this.showSuccess('Демо-режим включен');
        } else {
            this.demoMode = false;
        }
    }

    toggleTokenVisibility() {
        const tokenInput = this.apiTokenInstanceInput;
        const toggleBtn = this.toggleTokenBtn;
        
        if (tokenInput.type === 'password') {
            tokenInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            tokenInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }

    getCredentials() {
        const idInstance = this.idInstanceInput.value.trim();
        const apiTokenInstance = this.apiTokenInstanceInput.value.trim();

        if (!idInstance || !apiTokenInstance) {
            this.showError('Пожалуйста, введите idInstance и ApiTokenInstance');
            return null;
        }

        return { idInstance, apiTokenInstance };
    }

    async makeRequest(endpoint, method = 'GET', body = null) {
        // Demo mode responses
        if (this.demoMode) {
            return this.getDemoResponse(endpoint, method, body);
        }

        const credentials = this.getCredentials();
        if (!credentials) return null;

        const url = `${this.baseUrl}/waInstance${credentials.idInstance}/${endpoint}/${credentials.apiTokenInstance}`;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            this.showLoading(endpoint);
            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            this.showResponse(endpoint, data);
            return data;
        } catch (error) {
            this.showError(`${endpoint}: ${error.message}`);
            return null;
        }
    }

    getDemoResponse(endpoint, method, body) {
        this.showLoading(endpoint);
        
        const demoResponses = {
            'getSettings': {
                wid: "1234567890@c.us",
                countryInstance: "RU",
                typeInstance: "dev",
                webhookUrl: "https://example.com/webhook",
                delaySendMessages: 5,
                markIncomingMessagesReaded: false,
                markIncomingMessagesNotified: false,
                sharedSession: false
            },
            'getStateInstance': {
                stateInstance: "notAuthorized"
            },
            'sendMessage': {
                idMessage: "1234567890_ABCDEFGHIJKLMN",
                status: "sent"
            },
            'sendFileByUrl': {
                idMessage: "1234567890_OPQRSTUVWXYZ",
                status: "sent"
            },
            'getQRCode': {
                type: "image/jpeg",
                message: "demo-qr-code-base64-string"
            }
        };

        const response = demoResponses[endpoint];
        if (response) {
            setTimeout(() => {
                this.showResponse(endpoint, response);
                if (endpoint === 'getQRCode') {
                    this.showQRCode("demo-qr-code-base64-string");
                    this.qrCodeImage.innerHTML = '<div style="padding: 50px; background: #f0f0f0; border-radius: 10px;">📱 Демо QR-код<br><small>В реальности здесь будет QR-код WhatsApp</small></div>';
                }
            }, 1000);
        }
        
        return response;
    }

    async getSettings() {
        await this.makeRequest('getSettings');
    }

    async getStateInstance() {
        await this.makeRequest('getStateInstance');
    }

    async getQRCode() {
        const credentials = this.getCredentials();
        if (!credentials) return;

        const url = `${this.baseUrl}/waInstance${credentials.idInstance}/qr/${credentials.apiTokenInstance}`;

        try {
            this.showLoading('getQRCode');
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            // Handle different response formats
            if (data.type === 'image/jpeg' && data.message) {
                this.showQRCode(data.message);
                this.showResponse('getQRCode', { type: 'image/jpeg', status: 'QR-код получен' });
            } else if (data.type === 'alreadyLogged' || data.code === 400) {
                this.showSuccess('Инстанс уже авторизован, QR-код не нужен');
                this.showResponse('getQRCode', { status: 'already_authorized', message: data.message });
            } else {
                this.showError(`getQRCode: Неожиданный формат ответа: ${JSON.stringify(data)}`);
            }
        } catch (error) {
            this.showError(`getQRCode: ${error.message}`);
        }
    }

    async sendMessage() {
        const phoneNumber = this.phoneNumberInput.value.trim();
        const messageText = this.messageTextInput.value.trim();

        if (!phoneNumber || !messageText) {
            this.showError('Пожалуйста, введите номер телефона и текст сообщения');
            return;
        }

        if (!phoneNumber.match(/^\d{10,15}$/)) {
            this.showError('Номер телефона должен содержать от 10 до 15 цифр без пробелов и специальных символов');
            return;
        }

        const body = {
            chatId: `${phoneNumber}@c.us`,
            message: messageText
        };

        // Add delay between messages
        this.showSuccess('Отправка сообщения... Подождите 3 секунды');
        
        setTimeout(async () => {
            const result = await this.makeRequest('sendMessage', 'POST', body);
            
            if (result && result.idMessage) {
                this.showSuccess(`Сообщение отправлено! ID: ${result.idMessage}`);
                this.showInfo('Подождите 30 секунд перед следующим сообщением (защита от спама)');
            }
        }, 3000);
    }

    async sendFileByUrl() {
        const fileUrl = this.fileUrlInput.value.trim();
        const phoneNumber = this.filePhoneInput.value.trim();

        if (!fileUrl || !phoneNumber) {
            this.showError('Пожалуйста, введите URL файла и номер телефона');
            return;
        }

        if (!phoneNumber.match(/^\d{10,15}$/)) {
            this.showError('Номер телефона должен содержать от 10 до 15 цифр без пробелов и специальных символов');
            return;
        }

        try {
            new URL(fileUrl);
        } catch {
            this.showError('Пожалуйста, введите корректный URL');
            return;
        }

        const body = {
            chatId: `${phoneNumber}@c.us`,
            urlFile: fileUrl,
            fileName: this.getFileNameFromUrl(fileUrl)
        };

        this.showSuccess('Отправка файла... Подождите 10 секунд');
        
        setTimeout(async () => {
            const result = await this.makeRequest('sendFileByUrl', 'POST', body);
            
            if (result && result.idMessage) {
                this.showSuccess(`Файл отправлен! ID: ${result.idMessage}`);
                this.showInfo('Проверьте статус в личном кабинете GREEN-API');
                this.showInfo('На бесплатном тарифе доставка может занять время');
            }
        }, 3000);
    }

    getFileNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const fileName = pathname.split('/').pop();
            return fileName || 'file';
        } catch {
            return 'file';
        }
    }

    showQRCode(base64Image) {
        this.qrCodeImage.innerHTML = `<img src="data:image/jpeg;base64,${base64Image}" alt="QR-код для WhatsApp">`;
    }

    showLoading(method) {
        const timestamp = new Date().toLocaleTimeString();
        const loadingMessage = `[${timestamp}] Выполняется ${method}...\n`;
        this.responseContent.textContent += loadingMessage;
        this.responseContent.scrollTop = this.responseContent.scrollHeight;
    }

    showResponse(method, data) {
        const timestamp = new Date().toLocaleTimeString();
        const response = `[${timestamp}] ${method} - Успешно:\n${JSON.stringify(data, null, 2)}\n\n`;
        this.responseContent.textContent += response;
        this.responseContent.scrollTop = this.responseContent.scrollHeight;
    }

    showError(message) {
        const timestamp = new Date().toLocaleTimeString();
        const errorMessage = `[${timestamp}] Ошибка: ${message}\n\n`;
        this.responseContent.textContent += errorMessage;
        this.responseContent.scrollTop = this.responseContent.scrollHeight;
    }

    showSuccess(message) {
        const timestamp = new Date().toLocaleTimeString();
        const successMessage = `[${timestamp}] SUCCESS: ${message}\n\n`;
        this.responseContent.textContent += successMessage;
        this.responseContent.scrollTop = this.responseContent.scrollHeight;
    }

    showInfo(message) {
        const timestamp = new Date().toLocaleTimeString();
        const infoMessage = `[${timestamp}] INFO: ${message}\n\n`;
        this.responseContent.textContent += infoMessage;
        this.responseContent.scrollTop = this.responseContent.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GreenAPI();
});
