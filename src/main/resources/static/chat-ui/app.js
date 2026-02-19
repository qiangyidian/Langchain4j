(function () {
    var MEMORY_ID_STORAGE_KEY = "consultant.chat.memory_id";

    new Vue({
        el: "#app",
        data: function () {
            return {
                inputText: "",
                messages: [],
                isSending: false,
                abortController: null,
                messageIdSeed: 1,
                memoryId: "",
                memoryIdLockedByUrl: false
            };
        },
        created: function () {
            this.initializeMemoryId();
        },
        computed: {
            canSend: function () {
                return !this.isSending && this.inputText.trim().length > 0;
            }
        },
        methods: {
            createMemoryId: function () {
                if (window.crypto && typeof window.crypto.randomUUID === "function") {
                    return window.crypto.randomUUID();
                }
                return "m-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
            },
            getStoredMemoryId: function () {
                try {
                    return localStorage.getItem(MEMORY_ID_STORAGE_KEY) || "";
                } catch (error) {
                    return "";
                }
            },
            setStoredMemoryId: function (memoryId) {
                try {
                    localStorage.setItem(MEMORY_ID_STORAGE_KEY, memoryId);
                } catch (error) {
                    return;
                }
            },
            readMemoryIdFromUrl: function () {
                try {
                    var params = new URLSearchParams(window.location.search);
                    var memoryIdFromUrl = params.get("memoryId");
                    if (memoryIdFromUrl && memoryIdFromUrl.trim()) {
                        return memoryIdFromUrl.trim();
                    }
                } catch (error) {
                    return "";
                }
                return "";
            },
            initializeMemoryId: function () {
                var memoryIdFromUrl = this.readMemoryIdFromUrl();
                if (memoryIdFromUrl) {
                    this.memoryId = memoryIdFromUrl;
                    this.memoryIdLockedByUrl = true;
                    this.setStoredMemoryId(memoryIdFromUrl);
                    return;
                }

                this.memoryIdLockedByUrl = false;

                var memoryIdFromStorage = this.getStoredMemoryId();
                if (memoryIdFromStorage && memoryIdFromStorage.trim()) {
                    this.memoryId = memoryIdFromStorage.trim();
                    return;
                }

                this.memoryId = this.createMemoryId();
                this.setStoredMemoryId(this.memoryId);
            },
            ensureMemoryId: function () {
                if (this.memoryId && this.memoryId.trim()) {
                    return true;
                }
                this.initializeMemoryId();
                return !!(this.memoryId && this.memoryId.trim());
            },
            resetMemoryId: function () {
                if (this.memoryIdLockedByUrl) {
                    return false;
                }
                this.memoryId = this.createMemoryId();
                this.setStoredMemoryId(this.memoryId);
                return true;
            },
            createMessage: function (role, content, status) {
                return {
                    id: this.messageIdSeed++,
                    role: role,
                    content: content || "",
                    createdAt: Date.now(),
                    status: status || "done"
                };
            },
            roleLabel: function (role) {
                if (role === "user") {
                    return "你";
                }
                if (role === "assistant") {
                    return "助手";
                }
                return "系统";
            },
            formatTime: function (timestamp) {
                var date = new Date(timestamp);
                return date.toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit"
                });
            },
            messageClass: function (message) {
                return [
                    "message",
                    "message--" + message.role,
                    message.status === "streaming" ? "is-streaming" : "",
                    message.status === "error" ? "is-error" : ""
                ];
            },
            addSystemMessage: function (content, status) {
                var message = this.createMessage("system", content, status || "error");
                this.messages.push(message);
                this.$nextTick(this.scrollToBottom);
            },
            handleComposerKeydown: function (event) {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    this.onSend();
                }
            },
            stopGeneration: function () {
                if (this.abortController) {
                    this.abortController.abort();
                }
            },
            clearConversation: function () {
                if (this.isSending) {
                    return;
                }
                this.messages = [];
                this.resetMemoryId();
            },
            startNewSession: function () {
                if (this.isSending) {
                    return;
                }
                this.messages = [];
                if (!this.resetMemoryId()) {
                    this.addSystemMessage("当前 memoryId 来自 URL，无法重置。", "error");
                }
            },
            onSend: async function () {
                var prompt = this.inputText.trim();
                if (!prompt || this.isSending) {
                    return;
                }

                if (!this.ensureMemoryId()) {
                    this.addSystemMessage("memoryId 缺失，已阻止请求。请刷新页面或新建会话。", "error");
                    return;
                }

                this.inputText = "";
                this.isSending = true;
                this.abortController = new AbortController();

                var userMessage = this.createMessage("user", prompt, "done");
                this.messages.push(userMessage);

                var assistantMessage = this.createMessage("assistant", "", "streaming");
                this.messages.push(assistantMessage);
                this.$nextTick(this.scrollToBottom);

                try {
                    await this.streamResponse(prompt, this.memoryId, assistantMessage, this.abortController.signal);
                    if (assistantMessage.status !== "error") {
                        assistantMessage.status = "done";
                    }
                    if (!assistantMessage.content.trim()) {
                        assistantMessage.content = "（未收到有效响应）";
                    }
                } catch (error) {
                    if (error && error.name === "AbortError") {
                        if (!assistantMessage.content.trim()) {
                            assistantMessage.content = "已停止生成";
                        }
                        assistantMessage.status = "done";
                    } else {
                        assistantMessage.status = "error";
                        if (!assistantMessage.content.trim()) {
                            assistantMessage.content = "生成失败，请稍后重试。";
                        }
                        var diagnostics = "未知错误";
                        if (error && error.message) {
                            diagnostics = error.message;
                        }
                        this.addSystemMessage("请求异常：" + diagnostics, "error");
                    }
                } finally {
                    this.isSending = false;
                    this.abortController = null;
                    this.$nextTick(this.scrollToBottom);
                }
            },
            streamResponse: async function (prompt, memoryId, assistantMessage, signal) {
                var url = "/chat?memoryId=" + encodeURIComponent(memoryId) + "&message=" + encodeURIComponent(prompt);
                var response = await fetch(url, {
                    method: "GET",
                    signal: signal,
                    headers: {
                        Accept: "text/plain, text/html"
                    }
                });

                if (!response.ok) {
                    var errorDetails = "";
                    try {
                        errorDetails = (await response.text() || "").trim();
                    } catch (error) {
                        errorDetails = "";
                    }
                    var diagnosticsMessage = "HTTP " + response.status;
                    if (errorDetails) {
                        diagnosticsMessage += " - " + errorDetails.slice(0, 200);
                    }
                    throw new Error(diagnosticsMessage);
                }

                if (!response.body) {
                    assistantMessage.content = await response.text();
                    return;
                }

                var reader = response.body.getReader();
                var decoder = new TextDecoder("utf-8");

                while (true) {
                    var result = await reader.read();
                    if (result.done) {
                        break;
                    }
                    var chunk = decoder.decode(result.value, { stream: true });
                    if (chunk) {
                        assistantMessage.content += chunk;
                        this.$nextTick(this.scrollToBottom);
                    }
                }

                var lastChunk = decoder.decode();
                if (lastChunk) {
                    assistantMessage.content += lastChunk;
                }
            },
            scrollToBottom: function () {
                var container = this.$refs.messageList;
                if (!container) {
                    return;
                }
                container.scrollTop = container.scrollHeight;
            }
        }
    });
})();
