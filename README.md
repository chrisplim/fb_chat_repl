# fb_chat_repl
Facebook Chat REPL for the terminal

Makes use of the facebook-chat-api npm package: https://www.npmjs.com/package/facebook-chat-api


Customized to my use, but may be useful to others.

Can save your active chats, similar to the UI, in your terminal!


For those who don't want to be specifically on facebook, to chat with their friends via facbeook messenger.

```
git clone git@github.com:chrisplim/fb_chat_repl.git
cd fb_chat_repl
npm install
node fb_chat_repl.js
```

Login and start chatting away.
the help message can be displayed by typing "help".

```
> help
h/help                - display this message
c/contacts            - list out all your contacts' names and thread IDs
l/list                - list out your currently active chat threads, ordered by context number
n/current             - displays who you are chatting with now(currently)
t #                   - switch to thread #, where # is a contextual number, not thread ID. "t 1" would switch to the thread saved in your first context slot.
s #                   - save the thread by #, where # is the thread ID. "s 123456" would save this threadID and friend to the next available context slot.
/<sticker_command>    - will try to send a sticker to the person you are currently chatting with.
anything other string - will send that string to the person you are currently chatting with.
```
