import "./Chat.css";
import { useState, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { marked } from "marked";
import DOMPurify from "dompurify";
import ToolSettings from "./ToolSettings";

const renderer = new marked.Renderer();
renderer.link = (href, title, text) =>
  `<a target="_blank" rel="noopener noreferrer" href="${href}" title="${title}">${text}</a>`;

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer,
  highlight: (code) => {
    return require("highlight.js").highlightAuto(code).value;
  },
});

// Function to stream a message letter by letter
const streamMessage = (message, callback, onCompletion) => {
  let index = 0;
  // Adjust interval based on message length - faster for longer messages
  const interval = setInterval(
    () => {
      // For long messages, increment by chunks rather than single character
      const chunkSize =
        message.length > 1000
          ? 100
          : message.length > 500
          ? 10
          : message.length > 200
          ? 5
          : 1;

      index += chunkSize;
      if (index <= message.length) {
        callback(message.slice(0, index));
      } else {
        callback(message); // Ensure we show the complete message
        clearInterval(interval);
        if (onCompletion) onCompletion();
      }
    },
    message.length > 50 ? 5 : 20
  );
};

const generateUserId = () => {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("userId", userId);
  }
  return userId;
};

const Chat = () => {
  const [userId] = useState(generateUserId());
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const chatMessagesRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [tools, setTools] = useState([]);
  const [activeTools, setActiveTools] = useState([]);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await fetch("http://localhost:3000/ai/tools", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTools(data);
          setActiveTools(data.map((tool) => tool.name));
        } else {
          console.error("Failed to fetch tools:", response.statusText);
        }
      } catch (err) {
        console.error("Error fetching tools:", err);
      }
    };

    fetchTools();
  }, [loading]);

  const toggleTool = (tool) => {
    setActiveTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const formatMessageContent = (content) => {
    // First process LaTeX equations
    const withLatex = content
      .replace(/\\\((.*?)\\\)/g, (_, eq) => `$${eq}$`) // Inline math
      .replace(/\\\[(.*?)\\\]/g, (_, eq) => `$${eq}$`); // Block math

    // Convert Markdown to HTML
    const rawHtml = marked.parse(withLatex);

    // Define allowed tags and attributes
    const allowedTags = [
      "a",
      "b",
      "blockquote",
      "code",
      "del",
      "dd",
      "div",
      "dl",
      "dt",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "i",
      "img",
      "kbd",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "span",
      "strong",
      "sub",
      "sup",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "ul",
      "math",
      "maction",
      "maligngroup",
      "malignmark",
      "menclose",
      "merror",
      "mfenced",
      "mfrac",
      "mi",
      "mlongdiv",
      "mmultiscripts",
      "mn",
      "mo",
      "mover",
      "mpadded",
      "mphantom",
      "mroot",
      "mrow",
      "ms",
      "mscarries",
      "mscarry",
      "msgroup",
      "mstack",
      "msline",
      "mspace",
      "msqrt",
      "msrow",
      "mstyle",
      "msub",
      "msup",
      "msubsup",
      "mtable",
      "mtd",
      "mtext",
      "mtr",
      "munder",
      "munderover",
      "semantics",
      "annotation",
      "annotation-xml",
    ];

    const allowedAttributes = {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt"],
      span: ["class", "style"],
      div: ["class", "style"],
      math: ["xmlns"],
      "*": ["class", "id", "style"],
    };

    // Sanitize HTML
    const sanitized = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttributes,
      ADD_TAGS: [
        "math",
        "maction",
        "maligngroup",
        "malignmark",
        "menclose",
        "merror",
        "mfenced",
        "mfrac",
        "mi",
        "mlongdiv",
        "mmultiscripts",
        "mn",
        "mo",
        "mover",
        "mpadded",
        "mphantom",
        "mroot",
        "mrow",
        "ms",
        "mscarries",
        "mscarry",
        "msgroup",
        "mstack",
        "msline",
        "mspace",
        "msqrt",
        "msrow",
        "mstyle",
        "msub",
        "msup",
        "msubsup",
        "mtable",
        "mtd",
        "mtext",
        "mtr",
        "munder",
        "munderover",
        "semantics",
        "annotation",
        "annotation-xml",
      ],
      ADD_ATTR: ["xmlns"],
    });

    // Render KaTeX equations
    const tempEl = document.createElement("div");
    tempEl.innerHTML = sanitized;

    tempEl.querySelectorAll(".language-math").forEach((el) => {
      try {
        const tex = el.textContent;
        const displayMode = el.classList.contains("block-math");
        const html = katex.renderToString(tex, {
          throwOnError: false,
          displayMode,
        });
        el.innerHTML = html;
      } catch (e) {
        el.innerHTML = `<span class="katex-error">${e.message}</span>`;
      }
    });

    return tempEl.innerHTML;
  };

  // Function to handle message sending
  const handleSendMessage = async () => {
    if (message.trim() !== "") {
      const newMessage = { content: "", original: message, isCompleted: false };

      // Add the user's message to the chat immediately and start typing effect
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Stream the user's message
      streamMessage(
        message,
        (typedMessage) => {
          setMessages((prevMessages) => {
            return prevMessages.map((msg, index) => {
              if (index === prevMessages.length - 1) {
                return { ...msg, content: typedMessage };
              }
              return msg;
            });
          });
        },
        () => handleMessageCompletion(messages.length - 1)
      );

      // Prepare the request body for the backend
      const requestBody = {
        senderId: userId,
        senderName: "",
        senderRole: "user",
        message: message,
        timeStamp: "2024-03-08T12:00:00Z",
        metaData: {},
        forceTool: "",
        activeTools: activeTools,
      };

      try {
        setLoading(true);
        const response = await fetch("http://localhost:3000/ai/answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          setLoading(false);
          const data = await response.json();

          // Add the assistant's message and simulate typing effect for it
          setMessages((prevMessages) => [
            ...prevMessages,
            { content: "", senderRole: "assistant" },
          ]);

          // Stream assistant's response
          streamMessage(
            data.message,
            (typedMessage) => {
              setMessages((prevMessages) => {
                return prevMessages.map((msg, index) => {
                  if (index === prevMessages.length - 1) {
                    return { ...msg, content: typedMessage };
                  }
                  return msg;
                });
              });
            },
            () => handleMessageCompletion(messages.length - 1)
          );
        } else {
          console.error("Error:", response.statusText);
        }
      } catch (error) {
        console.error("Request failed", error);
      } finally {
        setMessage("");
      }
    }
  };

  // Scroll to the bottom of the chat-messages container when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]); // Runs when messages change

  // Update the last character's color once the message is fully typed
  const handleMessageCompletion = (index) => {
    setMessages((prevMessages) => {
      return prevMessages.map((msg, i) => {
        if (i === index) {
          return { ...msg, isCompleted: true }; // Mark the message as completed
        }
        return msg;
      });
    });
  };

  // Handle Enter key press to send the message
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <div className="chat">
        {messages.length > 0 && (
          <ToolSettings
            tools={tools}
            setActiveTools={setActiveTools}
            activeTools={activeTools}
            toggleTool={toggleTool}
          />
        )}
        {!messages.length > 0 && (
          <div className="chat-placeholder">
            <div className="chat-placeholder-overlay"></div>
            <div className="chat-placeholder-text">
              <span className="orange">re:</span>cursor
            </div>
          </div>
        )}
        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`${
                msg.senderRole === "assistant"
                  ? "assistant-message chat-message"
                  : "chat-message"
              } `}
            >
              {msg.senderRole && (
                <div className="sender-role">{msg.senderRole}</div>
              )}
              <span
                dangerouslySetInnerHTML={{
                  __html: formatMessageContent(msg.content),
                }}
              />
            </div>
          ))}
          {loading && <div className="chat-loader">...</div>}
        </div>

        <div className="chat-input-group">
          <input
            type="text"
            placeholder="Message..."
            className="chat-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            required
          />
          <div className="chat-send-button" onClick={handleSendMessage}>
            <div className="chat-button-text">Send</div>
            <i className="bi bi-arrow-right-short chat-button-icon"></i>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;
