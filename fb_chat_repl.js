const facebook = require("facebook-chat-api")
const repl = require("repl")
const fs = require('fs')
const prompt = require('prompt')
const imageToAscii = require("image-to-ascii")

// Globals
var email = ''
var default_thread = {
    id: '',
    name: ''
}
var api = {}
var user = {}
var lastThread = null
var threads = []
var num_threads = 0
var current_thread = {}

init()
function init() {
  config = JSON.parse(fs.readFileSync('config.json'))
  email = config.user_email
  default_thread.id = config.default_thread.id
  default_thread.name = config.default_thread.name
  if(default_thread && default_thread.id && default_thread.name) {
    console.log('default_thread initialized')
    current_thread = default_thread
    addThread(default_thread)
  } else {
    console.log('default_thread ID or Name not defined.')
    console.log('If you know a specific friend that you want to always talk to, then you can define the default_thread info in config.json.')
    console.log('You can find out your friends\' information by typing "contacts"')
  }

  prompt.start()
  if(!email) {
    console.log('no email configured')
    prompt.get([{
      name: "email",
      required: true
    }, {
      name: "password",
      hidden: true,
    }], (err, result) => { authenticate(result) })
  } else {
    console.log(email);
    prompt.get([{
      name: "password",
      hidden: true
    }], (err, result) => { result.email = email; authenticate(result) })
  }

}

// Gathers relevant user details
function getUserDetails() {
  console.info("Fetching user details...")
  return new Promise((resolve, reject) => {
    api.getFriendsList((err, data) => {
      if (err) {
        console.error(err)
        reject()
      }
      user.friendsList = data
      resolve()
    })
  })
}

// Handle incoming messages
function handleMessage(message) {
  const unrenderableMessage = ", unrenderable :("

  if(message.isGroup && message.body !== undefined && message.body != "") {
    console.log('Group Message Incoming! From Thread: '+ message.threadID)
    console.log(message.body)
  }
  console.log(message.type);
  // seen message (not sent)
  if (!message.senderID || message.type != "message")
    return

  var sender = user.friendsList.find(f => { return f.userID === message.senderID })
  console.log('handling message');
  console.log(message);
  if(sender && 'fullName' in sender && sender.fullName) {
    sender = sender.fullName
  } else {
    sender = "Unknown User"
  }

  //console.log(sender);

  if (message.participantNames && message.participantNames.length > 1)
    sender = "'" + sender + "'" + " (" + message.senderName + ")"

  process.stderr.write("\x07")  // Terminal notification

  var messageBody = null

  if (message.body !== undefined && message.body != "") {
    // console.log("New message sender " + sender + " - " + message.body)
    messageBody = " - " + message.body
  }

  if (message.attachments.length == 0) {
    console.log("New message from " + sender + (messageBody || unrenderableMessage))
  } else {
    const attachment = message.attachments[0]//only first attachment
    const attachmentType = attachment.type.replace(/\_/g, " ")
    if(attachmentType == "sticker") {
      renderSticker(attachment.stickerID, sender);
    } else {
      console.log("New " + attachmentType + " from " + sender + (messageBody || unrenderableMessage))
    }
  }

  lastThread = message.threadID
}

function renderSticker(stickerID, sender) {
  console.log('New sticker from ' + sender);
  if(stickerID == '144885022352431') {
    imageToAscii('sticker_pics/pusheen_laugh.png', {
      colored: false,
      white_bg: true,
      size_options: {
        screen_size: {
          width: 20,
          height: 20
        }
      }
    }, (err, converted) => {
      console.log(err || converted);
    });
  } else {
    console.log("can't render this sticker");
  }
}

function sendSticker(stickerID) {
  if(!current_thread) {
    console.log('no thread saved yet');
  } else {
    var msg = {
      sticker: stickerID
    }
    api.sendMessage(msg, current_thread.id, err => {
      if (err) {
        console.warn("ERROR!", err)
      } else {
        console.log("Sent sticker to " + current_thread.name)
      }
    })
  }
}

function sendMessage(msg) {
  if(!current_thread) {
    console.log('no thread saved yet');
  } else {
    api.sendMessage(msg, current_thread.id, err => {
      if (err) {
        console.warn("ERROR!", err)
      } else {
        console.log("Sent message to " + current_thread.name)
      }
    })
  }
}

function switchThread(threadNum) {
  if(threadNum >= 1 && threadNum <= num_threads) {
    current_thread = threads[threadNum - 1]
    console.log('Switched to Thread #'+threadNum+' with: '+current_thread.name)
  }
}

function saveThread(threadID) {
  var recipient = user.friendsList.find(f => {
    return f.userID == threadID
  });
  if(recipient) {
    var threadInfo = {
      id: threadID,
      name: recipient.fullName
    }
    addThread(threadInfo)
  } else {
    console.log("Couldn't find user for this thread ID: "+threadID)
  }
}

//helper func
function addThread(threadInfo) {
  console.log('Thread '+threadInfo.id+' with '+threadInfo.name+' saved to INDEX '+(num_threads+1))
  threads[num_threads] = threadInfo
  num_threads++
}

function listThreads() {
  var i = 1;
  console.log('Saved Threads:')
  threads.forEach((th) => {
    console.log('Thread '+i+': '+JSON.stringify(th));
    i++
  });
}

function currentThread() {
  console.log('Current Thread with '+current_thread.name+', ID: '+current_thread.id)
}

function contacts() {
  user.friendsList.forEach(f => { console.log(f.fullName+': '+f.userID) })
}

function help() {
  console.log(
    'h/help                - display this message\n'+
    'c/contacts            - list out all your contacts\' names and thread IDs\n'+
    'l/list                - list out your currently active chat threads, ordered by context number\n'+
    'n/current             - displays who you are chatting with now(currently)\n'+
    't #                   - switch to thread #, where # is a contextual number, not thread ID. "t 1" would switch to the thread saved in your first context slot.\n'+
    's #                   - save the thread by #, where # is the thread ID. "s 123456" would save this threadID and friend to the next available context slot.\n'+
    '/<sticker_command>    - will try to send a sticker to the person you are currently chatting with.\n'+
    'anything other string - will send that string to the person you are currently chatting with.\n'
  )
}

// Processes every user input, via the repl.
// Call functions appropriate functions based on user input.
function processInput(rawInput) {
  var inputString = rawInput.replace("\n", "");
  if(inputString === "c" || inputString === "contacts") {
    contacts()
  } else if(inputString === "l" || inputString === "list") {
    listThreads()
  } else if(inputString === "n" || inputString === "current") {
    currentThread()
  } else if(inputString === "h" || inputString === "help") {
    help()
  } else {
    var threadToSwitch = /^t (\d)$/.exec(inputString)
    var threadToSave = /^s (\d.*)$/.exec(inputString)
    var stickerCommand = /^\/(.*)$/.exec(inputString)
    if(threadToSwitch) {
      switchThread(threadToSwitch[1])
    } else if(threadToSave) {
      saveThread(threadToSave[1])
    } else if(stickerCommand) {
      if(stickerCommand[1] === "pusheen_laugh")
      {
        sendSticker('144885022352431')
      } else if(stickerCommand[1] === "pusheen_cupcake") {
        sendSticker('554423744645480')
      } else {
        console.log("unrecognized sticker")
      }
    } else {
      sendMessage(inputString)
    }
  }
}

function authenticate(credentials) {
  facebook(credentials, (err, fbApi) => {
    if (err) { return console.error(err) }

    // assign to global variable
    api = fbApi
    api.setOptions({ logLevel: "silent" })

    console.info("Logged in as " + credentials.email)

    getUserDetails(api, user).then(() => {
      console.info("Listening for incoming messages...")

      // listen for incoming messages
      api.listen((err, message) => {
        if (err) { return console.error(err) }
        handleMessage(message)
      })

      // start REPL
      repl.start({
        ignoreUndefined: true,
        eval(cmd) {
          processInput(cmd)
        }
      })

    })

  })
}
