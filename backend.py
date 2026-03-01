import asyncio
import websockets
import pty
import os
import fcntl
import termios
import struct
import json

async def terminal_handler(websocket):
    print("Terminal connected via WebSocket.")
    # Fork a new PTY for the terminal session
    pid, fd = pty.fork()
    if pid == 0:
        # We are in the child process
        # Set environment variables so the shell knows about its capabilities
        env = os.environ.copy()
        env['TERM'] = 'xterm-256color'
        # Append homebrew path as it contains the executable we want
        env['PATH'] = env.get('PATH', '') + ':/opt/homebrew/bin:/usr/local/bin'
        
        # We directly launch the gemini CLI so the terminal sidebar IS the Gemini prompt
        os.execve('/opt/homebrew/bin/gemini', ['gemini', '--yolo'], env)
        return
    
    # We are in the parent process. The `fd` references the master end of the PTY.
    
    def set_winsize(row, col):
        """Update the PTY window size when the browser terminal resizes."""
        # Using struct to pack rows, cols, xpixels, ypixels (0, 0)
        winsize = struct.pack("HHHH", row, col, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

    # Set default size to prevent CLI node apps crashing on 0x0 dimension initialization
    set_winsize(24, 80)

    async def read_from_pty():
        """Continuously read from the PTY and send to WebSocket."""
        loop = asyncio.get_event_loop()
        while True:
            try:
                # Read bytes from the PTY asynchronously 
                data = await loop.run_in_executor(None, lambda: os.read(fd, 8192))
                if not data:
                    break
                await websocket.send(data.decode('utf-8', 'replace'))
            except Exception as e:
                print("PTY closed or read error:", e)
                break

    async def read_from_ws():
        """Continuously read from WebSocket and send to the PTY."""
        async for message in websocket:
            try:
                msg = json.loads(message)
                if msg.get('type') == 'input' and 'data' in msg:
                    os.write(fd, msg['data'].encode('utf-8'))
                elif msg.get('type') == 'resize':
                    # Terminal got resized, update PTY
                    set_winsize(msg['rows'], msg['cols'])
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print("WebSocket read error:", e)

    task1 = asyncio.ensure_future(read_from_pty())
    task2 = asyncio.ensure_future(read_from_ws())
    
    # Run until one of the tasks finishes (e.g. socket closes or PTY closes)
    done, pending = await asyncio.wait([task1, task2], return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    
    print("Terminal disconnected.")

async def main():
    print("Starting Gemini Sidebar Backend on ws://127.0.0.1:8765")
    async with websockets.serve(terminal_handler, "127.0.0.1", 8765):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
