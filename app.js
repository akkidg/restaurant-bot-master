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
  request = require('request');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

// Time Delay variable
var delayMills = 1000;
var reviewCounter = 0;

var isContactAsked = false;
var userContact = 0;

var bookingNumber;

var reviews = [
  "Masooma Razavi\nChili's was a wonderfull host for us when we had planned to spend some quality time at the eve of our parents anniversary. And I can proudly say they live upto the expectations of the American chain in terms of Quantity, Ambience and Food. Located in Banjara hills close to the Punjagutta/Somajigua circle is a well lit signboard. The place has got its own little space outside which I really liked.",
  "Faraaz Farshori\nAwesome restaurant and great food with warm service! This is not thenfirst time I have been here but it seems tey have hired some really professional customer care personnel like 'smart sunil' who value a customer and go out of their way to make them confortable and make their experience delightful!! Way to go chili's",
  "Meghana Kumar\nThis is officially my favorite place to go.Get the luscious burger, nachos, and just be grateful that food like this exists. Neat, crisp ambiance. Authentic service. And a great menu.Slightly pricy. But it's definitely one of those guilty pleasure places. ",
  "Ganesh Puvvala\nChili's has great ambience and great food. You will never disappointed with this place. The staff hospitality is good. This is my first time here. Will definitely visit again."  
];

var subMenu = {
  "food":[
  {"title":"Burgers","image_url":"https://b.zmtcdn.com/data/pictures/chains/7/90847/26c7e0533eb80938d85d8ce6c5403b7d.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_BURGER","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD_BACK"},
  {"title":"Salads","image_url":"https://b.zmtcdn.com/data/pictures/chains/7/90847/dc0097fbeba5315fb671093405a02c0f.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_SALAD","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD_BACK"},
  {"title":"Sea Food","image_url":"https://b.zmtcdn.com/data/reviews_photos/18c/7ec87b08ce81077c5b2a626efe39a18c_1475417145.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_SEAFOOD","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD_BACK"}
  ],
  "drinks":[
  {"title":"Handcrafted Drinks","image_url":"https://b.zmtcdn.com/data/reviews_photos/535/63395f8c548a5a17dfe18e04330bc535_1473109844.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_HANDCRAFTED","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS_BACK"},
  {"title":"Premium Wines","image_url":"https://b.zmtcdn.com/data/reviews_photos/27f/a948d00251fe9c87fbd213f228bd727f_1472917649.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_PREMIUM","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS_BACK"},
  {"title":"Ice Cold Beers","image_url":"https://b.zmtcdn.com/data/reviews_photos/1cc/08f289c6d5769a0d792b2afe77d8d1cc_1471640882.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_ICECOLD","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS_BACK"}
  ],
  "deserts":[
  {"title":"Eggless Brownie","image_url":"https://b.zmtcdn.com/data/pictures/chains/7/90847/6b4cf4424e5527c738c8e3f6fe355e71.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_EGGLESS","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS_BACK"},
  {"title":"Chocolate Chip Paradise Pie","image_url":"https://b.zmtcdn.com/data/reviews_photos/88d/bebaa236bfd9215da7e59d35582ea88d_1473091156.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_CHOCOLATE","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS_BACK"},
  {"title":"Molten Chocolate Cake","image_url":"https://b.zmtcdn.com/data/reviews_photos/c9b/0f774bea3313f545ffa0802aefe12c9b_1475499955.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_checkout":"DEVELOPER_DEFINED_PAYLOAD_FOR_SUBMENU_MOLTEN","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS_BACK"}
  ] 
}

var items = {
  "burgers":[
  {"title":"Southerd SmokeHouse Burger","image_url":"https://b.zmtcdn.com/data/pictures/chains/7/90847/20a048c4293c724f3f7dfc82a751d3d9.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Sweet & Smoky Burger","image_url":"https://b.zmtcdn.com/data/pictures/chains/7/90847/908f5107783eefc0f28928bd12ae7fe0.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Classic Bacon Burger","image_url":"https://b.zmtcdn.com/data/pictures/chains/7/90847/34e1e71122a4e5da53171cbeebfdeba0.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Quacamole Burger","image_url":"https://b.zmtcdn.com/data/pictures/chains/7/90847/20a048c4293c724f3f7dfc82a751d3d9.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"}  
  ],
  "salads":[
  {"title":"Greeled Chicken Salad","image_url":"https://b.zmtcdn.com/data/reviews_photos/e7d/86fe276bc6699f1b23f26905b88d9e7d_1483553335.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Fresco Salad","image_url":"https://b.zmtcdn.com/data/reviews_photos/b62/ed24ca3b3612ad1b5e20765b25460b62_1478001660.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Ancho Salmon","image_url":"https://b.zmtcdn.com/data/reviews_photos/51e/b34e6ba87e273a0781014de71738e51e_1476011172.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"}
  ],
  "seafood":[
  {"title":"Chiptole Salmon","image_url":"https://b.zmtcdn.com/data/reviews_photos/696/e08c4cbe0501e95f645daafc8b4dd696_1475529419.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Grilled Basa","image_url":"https://b.zmtcdn.com/data/reviews_photos/40e/ffceafaa765a1def0235cf27ecad840e_1475346328.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Crumb Fried Fish & Chips","image_url":"https://b.zmtcdn.com/data/reviews_photos/3d6/a79e3c9bfcaca4580fc00186f560b3d6_1473109729.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"}
  ],
  "handcrafted":[
  {"title":"Whisky Lemonade","image_url":"https://b.zmtcdn.com/data/reviews_photos/1c7/c224975e8dc973dd8529f3672475b1c7_1473109685.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Old Fashioned","image_url":"https://b.zmtcdn.com/data/reviews_photos/34f/5676f2a78f165525f21b9ab19cc0534f_1477210279.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Michelada","image_url":"https://b.zmtcdn.com/data/reviews_photos/d9c/f04b4c8ee4a62f898880ecf0dced7d9c_1486963831.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Hot Toddy","image_url":"https://b.zmtcdn.com/data/reviews_photos/05e/d84440bd6f0d10bb78b635c797c8805e_1485488313.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"}  
  ],
  "premium":[
  {"title":"Presedente Margarita","image_url":"https://b.zmtcdn.com/data/reviews_photos/1c7/c224975e8dc973dd8529f3672475b1c7_1473109685.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Rita Trio","image_url":"https://b.zmtcdn.com/data/pictures/chains/7/90847/dc0097fbeba5315fb671093405a02c0f.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Tropical Sunrise Margarita","image_url":"https://b.zmtcdn.com/data/reviews_photos/9a1/749bab000dcec9a1ce46765b839129a1_1480817043.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"}
  ],
  "icecold":[
  {"title":"Long Island Ice Tea","image_url":"https://b.zmtcdn.com/data/reviews_photos/073/b11593aa5516925c33c717d3e7b99073_1485145167.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Long Island Mango Tea","image_url":"https://b.zmtcdn.com/data/reviews_photos/7c2/d6bda9c747f9ca6d4c11070c6ae117c2_1484152140.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"},
  {"title":"Long Island Strawberry Tea","image_url":"https://b.zmtcdn.com/data/reviews_photos/3df/5f3ded7eca9da72868a0cfdf392093df_1473109659.jpg","subtitle":"","default_action_url":"https://www.zomato.com/hyderabad/chilis-banjara-hills","payload_back":"DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK"}
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

  if(isContactAsked){
    userContact = messageText;
    isContactAsked = false;
    showTableSelectionQuickReplies(senderID);
    return;
  }


  if (messageText) {
    messageText = messageText.toLowerCase();
    console.log("swith case text: " + messageText);
    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText) {    

      case 'today\'s special':
        sendTypingOn(senderID);
        sendAllSpecial(senderID);
      break;

      case 'todays special':
        sendTypingOn(senderID);
        sendAllSpecial(senderID);        
      break;  

      case 'menu':
        sendTypingOn(senderID);
        sendMainMenu(senderID);
      break;

      case 'special':
        sendTypingOn(senderID);
        sendAllSpecial(senderID);
        break;

      case 'special dishes':
        sendTypingOn(senderID);
        sendAllSpecial(senderID);
        break;        

      case 'party':
        sendTypingOn(senderID);
        sendPartySpecial(senderID);
        break;        

      case 'party special':
        sendTypingOn(senderID);
        sendPartySpecial(senderID);
        break;       

      case 'opening hours':
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

      case 'hungry':
        
      break;

      case 'book table':

      break;

      case 'book a table':

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

  var confirmationText = "Hi, someOne. Your booking completed. Thank you.";

   if (payload) {
    // If we receive a text payload, check to see if it matches any special
    switch (payload) {
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_TWO':
          bookingNumber = "Two";
          showTextTemplate(senderID,confirmationText);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_BOOK_BETWEEN_FIVE':
          bookingNumber = "For Two to Five";
          showTextTemplate(senderID,confirmationText);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_BOOK_MORE_THAN_FIVE':
          bookingNumber = "For More Than Five";  
          showTextTemplate(senderID,confirmationText);
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
          if(userContact)
            showTableSelectionQuickReplies(senderID);
          else
            showAskContactTemplate(senderID);
        break;
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_OPENING_HOURS':
          sendTypingOn(senderID);
          sendOpeningHoursText(senderID);

          setTimeout(function(){    
            sendQuickReplySpecial(senderID);
          },delayMills);
          break;
        case 'GET_STARTED_BUTTON_PAYLOAD':
          console.log("Received postback for get started button");
          sendTypingOn(senderID);
          sendWelcomeMessage(senderID);
        break;        
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_MAIN_MENU_BACK':        
            sendQuickRepliesActions(senderID);
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
        case 'DEVELOPER_DEFINED_PAYLOAD_FOR_ITEM_BACK':
          sendTypingOn(senderID);
          sendQuickRepliesActions(senderID);
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
          elements:[
             {
              title:"Welcome to Chili's Bar & Cafe",
              image_url:"https://b.zmtcdn.com/data/pictures/4/97824/ebbcf1c5632b53257159facd17b1557a.jpg",
              subtitle:"Try Delicious Food",
              default_action: {
                type: "web_url",
                url: "https://www.zomato.com/hyderabad/chilis-banjara-hills",
                messenger_extensions: true,
                webview_height_ratio: "tall",
                fallback_url: "https://www.zomato.com/hyderabad/chilis-banjara-hills"
              },
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
            item_url: "https://www.famousgreeksalads.com/order-food-online/Family-Meals/c=5864/clear/",               
            image_url: "https://b.zmtcdn.com/data/reviews_photos/ffc/13a6b39dae49d67b7b3fdd536e8c8ffc_1473079760.jpg",
            buttons: [{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_FOOD",
              title: "Checkout"
            },{
              type:"phone_number",
              title:"Call",
              payload:"+919951700248"
            },{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_MAIN_MENU_BACK",
              title: "Back"
            }],
          }, {
            title: "Drinks",
            item_url: "https://www.famousgreeksalads.com/order-food-online/Soups-and-Starters/c=1518/clear/",               
            image_url: "https://b.zmtcdn.com/data/pictures/4/97824/e74c3c1e40eff1d32dc4842ff5a8217d_top_thumb_620_314.jpg",
            buttons: [{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_DRINKS",
              title: "Checkout"
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
            item_url: "https://www.famousgreeksalads.com/order-food-online/Famous-Favorites/c=6239/clear/",               
            image_url: "https://b.zmtcdn.com/data/reviews_photos/fd4/cfe452dea8c8804678b88dbf55070fd4_1470577220.jpg",
            buttons: [{
              type: "postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD_FOR_DESERTS",
              title: "Checkout"
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
      text: "Get Connected with us...",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Testimonials",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_TESTIMONALS"      
        },
        {
          "content_type":"text",
          "title":"Reviews",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_REVIEWS"
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
  var messageData = {
    recipient: {
      id: recipientId
    },message:{
      text:"Hello, SomeName. Please give us your contact number?"
    }
  };

  callSendAPI(messageData);
  isContactAsked = true;
}

function showTableSelectionQuickReplies(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "How many people's are with you?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"2",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_TWO"      
        },
        {
          "content_type":"text",
          "title":"3 - 5",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_BOOK_BETWEEN_FIVE"
        },
        {
          "content_type":"text",
          "title":"More than 5",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_BOOK_MORE_THAN_FIVE"
        }
      ]
    }
  };

  callSendAPI(messageData);
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
        default_action: {
          type: "web_url",
          url: itemMenuArray[i].default_action_url,
          messenger_extensions: true,
          webview_height_ratio: "tall",
          fallback_url: "https://www.zomato.com/hyderabad/chilis-banjara-hills"
        },
        buttons:[{
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
        default_action: {
          type: "web_url",
          url: subMenuArray[i].default_action_url,
          messenger_extensions: true,
          webview_height_ratio: "tall",
          fallback_url: "https://www.zomato.com/hyderabad/chilis-banjara-hills"
        },
        buttons:[
        {
        type: "postback",
        payload: subMenuArray[i].payload_checkout,
        title: "Checkout"
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

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;


