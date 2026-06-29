import { useState } from "react"

function App() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [iframeKey, setIframeKey] = useState(0);

  const handleChange = (e) => {
    setInputValue(e.target.value);
  }

  const sendData = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputValue.trim()) return;

    const userPrompt = inputValue
    setMessages(e => [...e, `user: ${userPrompt}`])
    setInputValue("")

    try {
      const response = await fetch('http://localhost:3000/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt })
      })

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // Keep incomplete lines in the buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawData = line.replace("data: ", "");
            try {
              const parsed = JSON.parse(rawData);

              // 3. Handle different step types
              if (parsed.type === 'tool_output') {
                setMessages(prev => [...prev, `⚙️ System: Finished running ${parsed.name}`]);

                // ⚡️ THE MAGIC TRICK: If the AI just started the server, wait 2 seconds, then refresh the iframe!
                if (parsed.name === 'start_development_server') {
                  setTimeout(() => {
                    setIframeKey(prevKey => prevKey + 1);
                  }, 4000);
                }
              } else if (parsed.type === 'final') {
                setMessages(prev => [...prev, `AI: ${parsed.text}`]);
              } else if (parsed.type === 'error') {
                setMessages(prev => [...prev, `Error: ${parsed.message}`]);
              }
            } catch (e) {
              console.log(e)
            }
          }
        }
      }

    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, `System Error: Failed to connect to backend.`]);
    }
  }

  return (
    <div className="flex bg-black h-screen">
      <div className="text-white border flex-3 text-wrap scroll-auto">
        <div>{
          messages.map((msg, index) => (
            <div key={index} className="whitespace-pre-wrap border-b border-gray-700 pb-1">
              {msg}
            </div>
          ))
        }
        </div>
        <input
          value={inputValue}
          onChange={handleChange}
          className="border text-white"
          placeholder='Insert prompt'
        />
        <button
          onClick={sendData}
          className="cyan bg-white text-black"
        >Submit</button>
      </div>
      <iframe
        key={iframeKey}
        title="preview"
        src="http://localhost:5170/"
        className="flex-7"></iframe>
    </div>
  )
}

export default App
