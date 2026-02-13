(function () {
    new Vue({
        el: "#app",
        data: function () {
            return {
                inputText: "",
                messages: [],
                isSending: false,
                abortController: null,
                messageIdSeed: 1
            };
        },
        computed: {
            canSend: function () {
                return !this.isSending && this.inputText.trim().length > 0;
            }
        },
        methods: {
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
            },
            onSend: async function () {
                var prompt = this.inputText.trim();
                if (!prompt || this.isSending) {
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
                    await this.streamResponse(prompt, assistantMessage, this.abortController.signal);
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
                        this.addSystemMessage("请求异常：" + (error && error.message ? error.message : "未知错误"), "error");
                    }
                } finally {
                    this.isSending = false;
                    this.abortController = null;
                    this.$nextTick(this.scrollToBottom);
                }
            },
            streamResponse: async function (prompt, assistantMessage, signal) {
                var response = await fetch("/chat?message=" + encodeURIComponent(prompt), {
                    method: "GET",
                    signal: signal,
                    headers: {
                        Accept: "text/plain, text/html"
                    }
                });

                if (!response.ok) {
                    throw new Error("HTTP " + response.status);
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
