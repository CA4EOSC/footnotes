import pty
import os
import time

pid, fd = pty.fork()
if pid == 0:
    env = os.environ.copy()
    os.execve('/opt/homebrew/bin/gemini', ['gemini', '--yolo'], env)
else:
    time.sleep(1)
    print(os.read(fd, 1024))
