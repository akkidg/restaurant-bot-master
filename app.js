/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const 
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request'),
  firebase  = require('firebase'),
  schedule = require('node-schedule'),
  Promise = require('promise');

  // Firebase Var Initialisation

  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
  const FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN;
  const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;
  const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

  var firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    databaseURL: FIREBASE_DB_URL,
    storageBucket: FIREBASE_STORAGE_BUCKET,
  };

  firebase.initializeApp(firebaseConfig);

  var database = firebase.database();

  const ordersReference = database.ref('orders');

  var app = express();
  app.set('port', process.env.PORT || 5000);
  app.set('view engine', 'ejs');
  app.use(bodyParser.json({ verify: verifyRequestSignature }));
  app.use(express.static('public'));

  // Order Booking variables

  const maxSlotSize = 20;

  var firstName = "";

  var timeSlot;
  var bookingNumber;

  // Time Delay variable
  var delayMills = 1000;
  var reviewCounter = 0;

  // Session Initialisation

  var UserSession = {};

  /*
    App Constants
  */

  // App Secret can be retrieved from the App Dashboard
  const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ? 
    process.env.MESSENGER_APP_SECRET :
    config.get('appSecret');

  // Arbitrary value used to validate a webhook
  const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
    (process.env.MESSENGER_VALIDATION_TOKEN) :
    config.get('validationToken');

  // Generate a page access token for your page from the App Dashboard
  const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
    (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
    config.get('pageAccessToken');

  // URL where the app is running (include protocol). Used to point to scripts and 
  // assets located at this address. 
  const SERVER_URL = (process.env.SERVER_URL) ?
    (process.env.SERVER_URL) :
    config.get('serverURL');

  /*
  * Menu, Reviews, MenuItems Array Declaration
  */  

  var reviews = [
    "Masooma Razavi\nChili's was a wonderfull host for us when we had planned to spend some quality time at the eve of our parents anniversary. And I can proudly say they live upto the expectations of the American chain in terms of Quantity, Ambience and Food. Located in Banjara hills close to the Punjagutta/Somajigua circle is a well lit signboard. The place has got its own little space outside which I really liked.",
    "Faraaz Farshori\nAwesome restaurant and great food with warm service! This is not thenfirst time I have been here but it seems tey have hired some really professional customer care personnel like 'smart sunil' who value a customer and go out of their way to make them confortable and make their experience delightful!! Way to go chili's",
    "Meghana Kumar\nThis is officially my favorite place to go.Get the luscious burger, nachos, and just be grateful that food like this exists. Neat, crisp ambiance. Authentic service. And a great menu.Slightly pricy. But it's definitely one of those guilty pleasure places. ",
    "Ganesh Puvvala\nChili's has great ambience and great food. You will never disappointed with this place. The staff hospitality is good. This is my first time here. Will definitely visit again."  
  ];

  var subMenu = {
    "food":[
    {"title":"Burgers","image_url":SERVER_URL + "/assets/images/food1/food1.jpg","subtitle":"Yummy Burgers","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_BURGER","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD_BACK","payload_title":"Explore Burgers"},
    {"title":"Salads","image_url":SERVER_URL + "/assets/images/food2/food2.jpg","subtitle":"Tasty Salads","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_SALAD","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD_BACK","payload_title":"Explore Salads"},
    {"title":"Sea Food","image_url":SERVER_URL + "/assets/images/food3/food3.jpg","subtitle":"Fresh Sea food","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_SEAFOOD","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD_BACK","payload_title":"Explore Sea Food"}
    ],
    "drinks":[
    {"title":"Handcrafted Drinks","image_url":SERVER_URL + "/assets/images/drink1/drink1.jpg","subtitle":"Chilled Handcrafted Drinks","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_HANDCRAFTED","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS_BACK","payload_title":"Explore Drinks"},
    {"title":"Premium Wines","image_url":SERVER_URL + "/assets/images/drink2/drink2.jpg","subtitle":"Strong wines","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_PREMIUM","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS_BACK","payload_title":"Explore Wines"},
    {"title":"Ice Cold Beers","image_url":SERVER_URL + "/assets/images/drink3/drink3.jpg","subtitle":"Mild Beers","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_ICECOLD","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS_BACK","payload_title":"Explore Beers"}
    ],
    "deserts":[
    {"title":"Eggless Brownie","image_url":SERVER_URL + "/assets/images/desert1/desert1.jpg","subtitle":"Sizzling Brownie","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_EGGLESS","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS_BACK","payload_title":"Explore"},
    {"title":"Chocolate Chip Paradise Pie","image_url":SERVER_URL + "/assets/images/desert2/desert2.jpg","subtitle":"Sweet Paradise Pie","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_CHOCOLATE","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS_BACK","payload_title":"Explore"},
    {"title":"Molten Chocolate Cake","image_url":SERVER_URL + "/assets/images/desert3/desert3.jpg","subtitle":"Delicious Molten cake","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_MOLTEN","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS_BACK","payload_title":"Explore"}
    ] 
  }

  var items = {
    "burgers":[
    {"title":"Southerd SmokeHouse Burger","image_url":SERVER_URL + "/assets/images/food11/food11.jpg","subtitle":"$7","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Sweet & Smoky Burger","image_url":SERVER_URL + "/assets/images/food11/food12.jpg","subtitle":"$7.5","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Classic Bacon Burger","image_url":SERVER_URL + "/assets/images/food11/food13.jpg","subtitle":"$8","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Quacamole Burger","image_url":SERVER_URL + "/assets/images/food11/food14.jpg","subtitle":"$6","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"}  
    ],
    "salads":[
    {"title":"Greeled Chicken Salad","image_url":SERVER_URL + "/assets/images/food21/food21.jpg","subtitle":"$3","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Fresco Salad","image_url":SERVER_URL + "/assets/images/food21/food22.jpg","subtitle":"$3.2","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Ancho Salmon","image_url":SERVER_URL + "/assets/images/food21/food23.jpg","subtitle":"$4","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"}
    ],
    "seafood":[
    {"title":"Chiptole Salmon","image_url":SERVER_URL + "/assets/images/food31/food31.jpg","subtitle":"$7","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Grilled Basa","image_url":SERVER_URL + "/assets/images/food31/food32.jpg","subtitle":"$8","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Crumb Fried Fish & Chips","image_url":SERVER_URL + "/assets/images/food31/food33.jpg","subtitle":"$7","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"}
    ],
    "handcrafted":[
    {"title":"Whisky Lemonade","image_url":SERVER_URL + "/assets/images/drink11/drink11.jpg","subtitle":"$6","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Old Fashioned","image_url":SERVER_URL + "/assets/images/drink11/drink12.jpg","subtitle":"$7","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Michelada","image_url":SERVER_URL + "/assets/images/drink11/drink13.jpg","subtitle":"$5","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Hot Toddy","image_url":SERVER_URL + "/assets/images/drink11/drink14.jpg","subtitle":"$8","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"}  
    ],
    "premium":[
    {"title":"Presedente Margarita","image_url":SERVER_URL + "/assets/images/drink21/drink21.jpg","subtitle":"$5","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Rita Trio","image_url":SERVER_URL + "/assets/images/drink21/drink22.jpg","subtitle":"$5","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Tropical Sunrise Margarita","image_url":SERVER_URL + "/assets/images/drink21/drink23.jpg","subtitle":"$4","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"}
    ],
    "icecold":[
    {"title":"Long Island Ice Tea","image_url":SERVER_URL + "/assets/images/drink31/drink31.jpg","subtitle":"$3","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Long Island Mango Tea","image_url":SERVER_URL + "/assets/images/drink31/drink32.jpg","subtitle":"$4","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"},
    {"title":"Long Island Strawberry Tea","image_url":SERVER_URL + "/assets/images/drink31/drink33.jpg","subtitle":"$3","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK","payload_review":"DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW"}
    ]
  }

  var serviceHighlights = "Our Service Highlights\n- Home Delivery\n- Full Bar Available\n- Live Music\n- Smoking Area\n- Wifi\n- Live Sports Screening\n- Valet Parking Available\n- Featured in Collection\n- Happy hours";
  var testimonials = "Awesome restaurant and great food with warm service!\nCuisines\nMexican, American, Tex-Mex, Burger";
  var knowFor = "Known For\nSignature Margaritas, American portions and music";

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */


if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

console.log("validation token " + VALIDATION_TOKEN + " PAGE_ACCESS_TOKEN : " + PAGE_ACCESS_TOKEN);

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL. 
 * 
 */
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will 
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam, 
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  var user = UserSession[senderID];

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", 
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);

    receivedQuickReplyPostback(event);
    return;
  }

  if(user != null){
    if(user.contactNum == null){
      user.contactNum = messageText;
      showTimeSlotSelectionQuickReplies(user.fbId);
      return;
    }

    if(user.isOrderInProgress){
      showOrderContinuationForm(user.fbId);
      return;
    }
  }
  

  if (messageText) {
    messageText = messageText.toLowerCase();
    console.log("swith case text: " + messageText);
    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText) {    

      case 'menu':
        sendTypingOn(senderID);
        sendMainMenu(senderID);
      break;       

      case 'opening hours':
        sendTypingOn(senderID);
        sendOpeningHoursText(senderID);
      break;   

      case 'hours':
        sendTypingOn(senderID);
        sendOpeningHoursText(senderID);
      break;

      case 'gallery':
        /*sendTypingOn(senderID);
        showGallery(senderID);*/
      break;

      case 'testimonials':
        sendTypingOn(senderID);
        showTestimonials(senderID);
      break;

      case 'reviews':
        sendTypingOn(senderID);
        showReviews(senderID);
      break;      

      case 'review':
        sendTypingOn(senderID);
        showReviews(senderID);
      break;

      case 'hungry':
        
      break;

      case 'book table':
        sendTypingOn(senderID);
        showAskContactTemplate(senderID);
      break;

      case 'book a table':
        sendTypingOn(senderID);
        showAskContactTemplate(senderID);
      break;

      case 'food':
        sendTypingOn(senderID);
        showSubMenu(senderID,"food");
      break;

      case 'drinks':
        sendTypingOn(senderID);
        showSubMenu(senderID,"drinks");
      break;

      case 'deserts':
        sendTypingOn(senderID); 
        showSubMenu(senderID,"deserts");
      break; 

      case 'location':
        sendTypingOn(senderID);
        sendLocationTemplate(senderID);
      break;

      case 'our location':
        sendTypingOn(senderID);
        sendLocationTemplate(senderID);
      break;

      default:
        sendTypingOn(senderID);
        sendWelcomeMessage(senderID);

        setTimeout(function(){    
            showTextTemplate(senderID,"Hi, We'r happy to see u back..");
          },delayMills);     
    }
  } else if (messageAttachments) {
    sendTypingOn(senderID);
    sendWelcomeMessage(senderID);
    /*setTimeout(function(){    
      sendQuickReplySpecial(senderID);
    },delayMills);*/
  }
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s", 
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}

/*
 * Quick Reply Postback Event
 *
 * This event is called when a postback is tapped on a Quick Reply. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */

function receivedQuickReplyPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;
  var message = event.message;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var quickReply = message.quick_reply;
  var payload = quickReply.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  var user = UserSession[senderID];
  if(user != null){
    if(user.isOrderInProgress){
      showOrderContinuationForm(user.fbId);
      return;
    }
  }


   if (payload) {
    // If we receive a text payload, check to see if it matches any special
    switch (payload) {
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_ONE':
          if(user == null)  return;
          user.bookingNumber = 1;
          saveOrderToDatabase(user.fbId);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_TWO':
          if(user == null)  return;
          user.bookingNumber = 2;
          saveOrderToDatabase(user.fbId);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_THREE':
          if(user == null)  return;
          user.bookingNumber = 3;  
          saveOrderToDatabase(user.fbId);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_FOUR':
          if(user == null)  return;
          user.bookingNumber = 4;  
          saveOrderToDatabase(user.fbId);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_FIVE':
          if(user == null)  return;
          user.bookingNumber = 5;  
          saveOrderToDatabase(user.fbId);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_REVIEWS':
          sendTypingOn(senderID);
          showReviews(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_TESTIMONALS':
          sendTypingOn(senderID);
          showTestimonials(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_START_OVER':
          sendTypingOn(senderID);
          sendWelcomeMessage(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_MENU':
          sendTypingOn(senderID);
          sendMainMenu(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_12':
          if(user == null)  return;
          user.timeSlot = "122";
          checkIsBookingAvailable(senderID);
        break;        
        case 'DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_2':
          if(user == null)  return;
          user.timeSlot = "24";
          checkIsBookingAvailable(senderID);
        break;   
        case 'DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_4':
          if(user == null)  return;
          user.timeSlot = "46";
          checkIsBookingAvailable(senderID);
        break;   
        case 'DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_6':
          if(user == null)  return;
          user.timeSlot = "68";
          checkIsBookingAvailable(senderID);
        break;   
        case 'DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_8':
          if(user == null)  return;
          user.timeSlot = "810";
          checkIsBookingAvailable(senderID);
        break;   
        case 'DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_10':
          if(user == null)  return;
          user.timeSlot = "1012";
          checkIsBookingAvailable(senderID);
        break;
        default:
        sendTypingOn(senderID);
        sendWelcomeMessage(senderID);
    }
  }else if(user != null){
    if(user.isOrderInProgress)
      showOrderContinuationForm(user.fbId);
    return;
  }else{
    sendTypingOn(senderID);
    sendWelcomeMessage(senderID);
  }
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  var user = UserSession[senderID];

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

   if (payload) {
    // If we receive a text payload, check to see if it matches any special
    switch (payload) {
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_MENU':
          sendTypingOn(senderID);
          sendMainMenu(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_LOCATION':
          sendTypingOn(senderID);
          sendLocationTemplate(senderID);
/*
          setTimeout(function(){    
            sendQuickReplySpecial(senderID);
          },delayMills);*/
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_BOOK_TABLE':
          sendTypingOn(senderID);

          var user;

          if(UserSession[senderID] == null){
            getUserInfo(senderID,function(){
              if(firstName != ""){
                user = new User(senderID,firstName);
                UserSession[senderID] = user;                           
              }
              if(user.bookForDay == null)
                showOrderBookingPreference(senderID);
              else if(user.contactNum && user.bookingNumber == null)
                showTableSelectionQuickReplies(user.fbId);
              else if(user.bookingNumber)
                showTimeSlotSelectionQuickReplies(user.fbId);
              else
                showAskContactTemplate(user.fbId);
            });
          }else{
            user = UserSession[senderID];
            if(user.bookForDay == null)
              showOrderBookingPreference(senderID);
            else if(user.contactNum && user.bookingNumber == null)
              showTableSelectionQuickReplies(user.fbId);
            else if(user.bookingNumber)
              showTimeSlotSelectionQuickReplies(user.fbId);
            else
              showAskContactTemplate(user.fbId);
          }  

        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_OPENING_HOURS':
          sendTypingOn(senderID);
          sendOpeningHoursText(senderID);

          /*setTimeout(function(){    
            sendQuickReplySpecial(senderID);
          },delayMills);*/
          break;
        case 'GET_STARTED_BUTTON_PAYLOAD':
          console.log("Received postback for get started button");

          sendTypingOn(senderID);

          UserSession[senderID] = null;

            //getUserData();

            getUserInfo(senderID,function(){
              if(firstName != ""){
                var user = new User(senderID,firstName);
                UserSession[senderID] = user;

                var greetText = "Hello " + user.firstName + ", Welcome to Chili's Bar & Cafe"

                showTextTemplate(user.fbId,greetText);
                setTimeout(function(){
                  sendWelcomeMessage(user.fbId);
                },delayMills);
              }else{
                 sendWelcomeMessage(senderID); 
              }
            });
          
        break;        
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_MAIN_MENU_BACK':        
          sendTypingOn(senderID);
          sendWelcomeMessage(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD':
          sendTypingOn(senderID);
          showSubMenu(senderID,"food");
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS':
          sendTypingOn(senderID); 
          showSubMenu(senderID,"deserts");
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS':
          sendTypingOn(senderID);
          showSubMenu(senderID,"drinks"); 
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_BURGER':
          sendTypingOn(senderID);
          showItemTemplate(senderID,"burgers");
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_SALAD':
          sendTypingOn(senderID);
          showItemTemplate(senderID,"salads");
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_SEAFOOD':
          sendTypingOn(senderID);
          showItemTemplate(senderID,"seafood");
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_HANDCRAFTED':
          sendTypingOn(senderID);
          showItemTemplate(senderID,"handcrafted");
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_PREMIUM':
          sendTypingOn(senderID);
          showItemTemplate(senderID,"premium");
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_ICECOLD':
          sendTypingOn(senderID);
          showItemTemplate(senderID,"icecold");
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKSITEM_BACK':
          sendTypingOn(senderID);
          showSubMenu(senderID,"drinks"); 
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_FOODITEM_BACK':
          sendTypingOn(senderID);
          showSubMenu(senderID,"food");
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD_BACK':
          sendTypingOn(senderID);
          sendMainMenu(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS_BACK':
          sendTypingOn(senderID);
          sendMainMenu(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS_BACK':
          sendTypingOn(senderID);
          sendMainMenu(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_REVIEW':
          sendTypingOn(senderID);
          var x = Math.floor((Math.random() * 4) + 0);
          showTextTemplate(senderID,reviews[x]);
          setTimeout(function(){                
            sendQuickRepliesActions(senderID);
          },delayMills);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_ORDER_CANCEL':
          if(user == null) return;
          UserSession[senderID] = null;
          showMenu(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_ORDER_CONTINUE':
          if(user == null) return;
          if(user.bookForDay)
            showAskContactTemplate(user.fbId);
          else if(user.contact)
            showTimeSlotSelectionQuickReplies(user.fbId);   
          else if(user.timeSlot)            
            showTableSelectionQuickReplies(user.fbId);         
          else
            showOrderBookingPreference(user.fbId);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_ORDER_TODAY':
          if(user == null) return;
          user.bookForDay = 0;
          showAskContactTemplate(user.fbId);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_ORDER_TOMORROW':
          if(user == null) return;
          user.bookForDay = 1;
          showAskContactTemplate(user.fbId);
        break;
        default:
        sendTypingOn(senderID);
        sendWelcomeMessage(senderID);
    }
   }else{
        sendTypingOn(senderID);
        sendWelcomeMessage(senderID);
   }
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
}

var getUserInfo = function (recipientId,callback) {
  var uri = 'https://graph.facebook.com/v2.6/' + recipientId;
  request({
    uri: uri,
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'GET'
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("user profile body : " + body);
      var jsonObject =  JSON.parse(body);
      firstName = jsonObject.first_name;
      saveUserToFirebase(recipientId,firstName,jsonObject.last_name);      
      callback();
    } else {
      firstName = "";
      callback();
      console.error("Failed calling User Profile API", response.statusCode, response.statusMessage, body.error);
    }
  });  
};

function saveUserToFirebase(recipientId,firstName,last_name){
  database.ref('users/' + recipientId).set({
    userId : recipientId,
    firstName : firstName,
    lastName : last_name
  });
}
/*
 * Send a text message using the Send API.
 *
 */
function sendWelcomeMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {        
      attachment:{
        type:"template",
        payload:{
          template_type:"generic",
          image_aspect_ratio:"square",
          elements:[
             {
              title:"Welcome to Chili's Bar & Cafe",
              image_url:SERVER_URL + "/assets/images/chillis.jpg",
              subtitle:"Try Delicious Food",              
              buttons:[
                {
                  type:"postback",
                  title:"Menu",
                  payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_MENU"
                },
                {
                  type:"postback",
                  title:"Our Location",
                  payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_LOCATION"
                },
                {
                    type:"postback",
                    title:"Book a Table",
                    payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_BOOK_TABLE"
                }          
              ]      
            }
          ]
        }    
      }
    }
  };

  callSendAPI(messageData);
}

// This send main menu
function sendMainMenu(recipientId){

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {        
      attachment:{
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Food",
            subtitle: "Tasty Crispy Food",               
            image_url: SERVER_URL + "/assets/images/food/food.jpg",
            buttons: [{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD",
              title: "Explore Food"
            },{
              type:"phone_number",
              title:"Call",
              payload:"+919951700248"
            },{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_MAIN_MENU_BACK",
              title: "Back"
            }]
          }, {
            title: "Drinks",
            subtitle: "Chilled Drinks",               
            image_url: SERVER_URL + "/assets/images/drinks/drinks.jpg",
            buttons: [{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS",
              title: "Explore Drinks"
            },{
              type:"phone_number",
              title:"Call",
              payload:"+919951700248"
            },{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_MAIN_MENU_BACK",
              title: "Back"
            }]
          },{
            title: "Deserts",
            subtitle: "Delicious Deserts",               
            image_url: SERVER_URL + "/assets/images/deserts/deserts.jpg",
            buttons: [{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS",
              title: "Explore Deserts"
            },{
              type:"phone_number",
              title:"Call",
              payload:"+919951700248"
            },{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_MAIN_MENU_BACK",
              title: "Back"
            }]
          }]
        }
      }
    }    
  };

  callSendAPI(messageData);
}

function sendLocationTemplate(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment:{
        type:"template",
        payload:{
          template_type: "generic",
          elements:[
          {
            title:"Chili's Bar & Cafe",
            image_url:"https://maps.googleapis.com/maps/api/staticmap?center=17.4232651,78.4488292&markers=color:red%7Clabel:C%7C17.4228191,78.4495778&zoom=16&size=600x400&key=AIzaSyBJqqGGwS1HthhCLL1HC8F5AcUeMu6eQVs",
            item_url:"https://www.google.co.in/maps/place/Chili's,+Banjara+Hills/@17.4223607,78.4474679,17z/data=!4m12!1m6!3m5!1s0x3bcb972ff51ff959:0xb9156f0a0239f86c!2sChili's,+Banjara+Hills!8m2!3d17.4223607!4d78.4496566!3m4!1s0x3bcb972ff51ff959:0xb9156f0a0239f86c!8m2!3d17.4223607!4d78.4496566"    
          }
          ]
        }
      }
    }
  };   
  callSendAPI(messageData);
}

function sendOpeningHoursText(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },message:{
      text:"RESTAURANT HOURS\n12 Noon to 11 PM"
    }
  };

  callSendAPI(messageData);
}

function sendQuickRepliesActions(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Get Connected...",
      quick_replies: [        
        {
          "content_type":"text",
          "title":"Menu",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_MENU"
        },
        {
          "content_type":"text",
          "title":"Start Over",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_START_OVER"
        }
      ]
    }
  };
  callSendAPI(messageData);
}

function showTestimonials(recipientId){
  var testimonialsText = testimonials + "\n\n" + serviceHighlights + "\n\n" + knowFor;
  var messageData = {
    recipient: {
      id: recipientId
    },message:{
      text:testimonialsText
    }
  };

  callSendAPI(messageData);
}

function showReviews(recipientId){
  console.log("reviews length :" + reviews.length);
  while(reviewCounter < reviews.length){
    var messageData = {
      recipient: {
        id: recipientId
      },message:{
        text:reviews[reviewCounter]
      }
    };
    callSendAPI(messageData);
    console.log("msg" + reviewCounter + " msgis " + reviews[reviewCounter]);
    reviewCounter++;
  }

  reviewCounter = 0;
}

function showTextTemplate(recipientId,msgText){
  var messageData = {
    recipient: {
      id: recipientId
    },message:{
      text:msgText
    }
  };

  callSendAPI(messageData);
}

function showAskContactTemplate(recipientId){
  var text;

  var user;

  if(UserSession[recipientId] == null){
    getUserInfo(recipientId,function(){
      if(firstName != ""){
        user = new User(recipientId,firstName);
        UserSession[recipientId] = user;                
      }
    });
  }else{
    user = UserSession[recipientId];
  }

  text = "Hello " + user.firstName + ", Please give us your contact number?";
  showContactTemplate(recipientId,text);
}

function showContactTemplate(recipientId,text){
  var messageData = {
    recipient: {
      id: recipientId
    },message:{
      text:text
    }
  };

  callSendAPI(messageData);  
}

function showTableSelectionQuickReplies(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Please select table size",
      quick_replies: [
        {
          "content_type":"text",
          "title":"for 1",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_ONE"      
        },
        {
          "content_type":"text",
          "title":"for 2",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_TWO"
        },
        {
          "content_type":"text",
          "title":"for 3",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_THREE"
        },
        {
          "content_type":"text",
          "title":"for 4",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOUR"
        },
        {
          "content_type":"text",
          "title":"for 5",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_FIVE"
        },
      ]
    }
  };

  callSendAPI(messageData);
}

function showTimeSlotSelectionQuickReplies(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Please select table time",
      quick_replies: [
        {
          "content_type":"text",
          "title":"12 - 2",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_12"      
        },
        {
          "content_type":"text",
          "title":"2 - 4",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_2"
        },
        {
          "content_type":"text",
          "title":"4 - 6",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_4"
        },
        {
          "content_type":"text",
          "title":"6 - 8",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_6"
        },
        {
          "content_type":"text",
          "title":"8 - 10",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_8"
        },
        {
          "content_type":"text",
          "title":"10 - 12",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_BOOK_TIME_10"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

function saveOrderToDatabase(recipientId){
  var user = UserSession[recipientId];
  if(user == null)  return;

  var orderDetails = {
    customerId : user.fbId,
    customerName : user.firstName,
    timeSlot : user.timeSlot,
    tablesize : user.bookingNumber,
    datetime : firebase.database.ServerValue.TIMESTAMP
  };

  var newOrderId = ordersReference.push();
  newOrderId.set(orderDetails,function(error){
    if(error){
      console.log("couldn't save to db error " + error);
    }else{
      console.log("record saved to db");
      var text = "Thank you, " + user.firstName + " Your booking confirmed.";
      showOrderConfirmationQuickReplies(user.fbId,text);
    }
  });   
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

function showItemTemplate(recipientId,menuText){

  var itemMenuArray;

  switch(menuText){
    case 'burgers':
    itemMenuArray = items.burgers;
    break;
    case 'salads':
    itemMenuArray = items.salads;
    break;
    case 'seafood':
    itemMenuArray = items.seafood;
    break;
    case 'handcrafted':
    itemMenuArray = items.handcrafted;
    break;
    case 'premium':
    itemMenuArray = items.premium;
    break;
    case 'icecold':
    itemMenuArray = items.icecold;
    break;
  }

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {        
      attachment:{
        type:"template",
        payload:{
          template_type:"generic",
          elements:getItemsJson(itemMenuArray)
        }    
      }
    }
  };
  
  //console.log("elements json: " + JSON.stringify(messageData));
  callSendAPI(messageData);
}

function showSubMenu(recipientId,menuText){

  var subMenuArray;

  if(menuText === "food"){
    subMenuArray = subMenu.food;
  }else if(menuText === "drinks"){
    subMenuArray = subMenu.drinks;
  }else{
    subMenuArray = subMenu.deserts;
  }

  console.log("submenu length: " + subMenuArray.length);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {        
      attachment:{
        type:"template",
        payload:{
          template_type:"generic",
          elements:getElementsJson(subMenuArray)
        }    
      }
    }
  };
  
  //console.log("elements json: " + JSON.stringify(messageData));
  callSendAPI(messageData);
}

function getItemsJson(itemMenuArray){
  var elements = [];
  var i;
  for (i in itemMenuArray) {
    var singleElement = {
        title:itemMenuArray[i].title,
        image_url:itemMenuArray[i].image_url,
        subtitle:itemMenuArray[i].subtitle,
        buttons:[{
        type: "postback",
        payload: itemMenuArray[i].payload_review,
        title: "Reviews"
        },{
        type: "postback",
        payload: itemMenuArray[i].payload_back,
        title: "Back"
        }          
      ]      
    };
    elements.push(singleElement); 
  }
  //return elements;
  return JSON.stringify(elements);
}

function getElementsJson(subMenuArray){
  var elements = [];
  var i;
  for (i in subMenuArray) {
    var singleElement = {
        title:subMenuArray[i].title,
        image_url:subMenuArray[i].image_url,
        subtitle:subMenuArray[i].subtitle,
        buttons:[
        {
        type: "postback",
        payload: subMenuArray[i].payload_checkout,
        title: subMenuArray[i].payload_title
        },{
        type: "postback",
        payload: subMenuArray[i].payload_back,
        title: "Back"
        }          
      ]      
    };
    elements.push(singleElement); 
  }
  //return elements;
  return JSON.stringify(elements);  
}

function showOrderContinuationForm(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
    attachment:{
      type:"template",
      payload:{
        template_type:"button",
        text:"You Were in middle of order. Do you want to continue?",
        buttons:[
          {
            type:"postback",
            title:"Continue Order",
            payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_ORDER_CONTINUE"
          },
          {
            type:"postback",
            title:"Start Over",
            payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_ORDER_CANCEL"
          }
        ]
        }
      }
    }
  };
   
  callSendAPI(messageData);

  var user = UserSession[recipientId];
  if(user != null){
    user.isOrderInProgress = true;
  }
}

function showMenu(recipientId){
  setTimeout(function(){    
            sendTypingOn(recipientId);
            sendMainMenu(recipientId);
          },delayMills);
}

function showOrderConfirmationQuickReplies(recipientId,text){
  var user = UserSession[recipientId];
  if(user == null)  return;

// user Session Cleared after order confirmation
  UserSession[recipientId] = null;

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: text,
      quick_replies: [
        {
          "content_type":"text",
          "title":"Checkout our Menu",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_MENU"      
        },
        {
          "content_type":"text",
          "title":"Back",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_START_OVER"
        }
      ]
    }
  };
  callSendAPI(messageData);
}

function getUserData(){
  var userRef = database.ref('/users');
  userRef.once('value',function(snapshot){
    snapshot.forEach(function(childsnapshot){
      var userid = childsnapshot.val().userId;
      var firstName = childsnapshot.val().firstName;
      console.log("user: " + userid + "," + firstName);
      //console.log("user: " + childsnapshot.val());
    });
  });
}

function checkIsBookingAvailable(recipientId){
  var user = UserSession[recipientId];
  if(user == null) return;  
  var selectedDay = user.bookForDay;
  var startTimeStamp, endTimeStamp;

  var today = new Date();

  if(selectedDay == 0){
    startTimeStamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt('01',8), 59, 50, 1000).getTime();
    endTimeStamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 50, 1000).getTime();
  } else{
    today.setDate(today.getDate() + 1);
    startTimeStamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt('01',8), 59, 50, 1000).getTime();
    endTimeStamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 50, 1000).getTime();
  }

  var currentSlotTableSize = 0;

  // Write Promise To check if slot full 
  var orderRef =  ordersReference.orderByChild('datetime').startAt(startTimeStamp).endAt(endTimeStamp);

  Promise.all([orderRef.once('value')]).then(function(snapshot){
    snapshot[0].forEach(function(childsnapshot){
        if(user.timeSlot == childsnapshot.val().timeSlot){
          currentSlotTableSize += childsnapshot.val().tablesize;
        }
      });
       console.log('currentSlotTableSize in foreach' + currentSlotTableSize);
      return currentSlotTableSize;
   }).then(function(currentSlotTableSize){
    console.log('got currentTableSize');
      if(currentSlotTableSize == maxSlotSize){
        var text = "Booking for your time slot is full, please select different one"          
        showTextTemplate(user.fbId,text);
        setTimeout(function(){
          showTimeSlotSelectionQuickReplies(user.fbId);
        },delayMills);
      } else{
        showTableSelectionQuickReplies(user.fbId);
      }
   }).catch(function(error){
    console.log('Failed to get currentSlotTableSize values', error);
   });

  /*ordersReference.orderByChild('datetime').startAt(startTimeStamp).endAt(endTimeStamp).once('value',
    function(snapshot){
      snapshot.forEach(function(childsnapshot){
        if(user.timeSlot == childsnapshot.val().timeSlot){
          currentSlotTableSize += childsnapshot.val().tablesize;
        }
      });
    },function(){
          if(currentSlotTableSize == maxSlotSize){
            var text = "Booking for your time slot is full, please select different one"          
            showTextTemplate(user.fbId,text);
            setTimeout(function(){
              showTimeSlotSelectionQuickReplies(user.fbId);
            },delayMills);
          } else{
            showTableSelectionQuickReplies(user.fbId);
          }
    });*/
}

function User(fbId,firstName){
  this.fbId = fbId;
  this.firstName = firstName;
  this.contactNum;
  this.bookingNumber;
  this.timeSlot;
  this.isOrderInProgress = false;
  this.bookForDay;
};

function showOrderBookingPreference(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
    attachment:{
      type:"template",
      payload:{
        template_type:"button",
        text:"When would you like to come?",
        buttons:[
          {
            type:"postback",
            title:"Today",
            payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_ORDER_TODAY"
          },
          {
            type:"postback",
            title:"Tomorrow",
            payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_ORDER_TOMORROW"
          }
        ]
        }
      }
    }
  };
   
  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}

function startHourlyBradcast(){
  var rule = new schedule.RecurrenceRule();
  rule.minute = 35;

  schedule.scheduleJob(rule,function(){
    var userRef = database.ref('/users');
    userRef.once('value',function(snapshot){
      snapshot.forEach(function(childsnapshot){
        var userid = childsnapshot.val().userId;
        var msg = "Hi " + childsnapshot.val().firstName + ", this is test broadcast.";
        showTextTemplate(userid,msg);
      });
    });
  });
  console.log("hourly broadcast start");
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  //startHourlyBradcast();
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;


