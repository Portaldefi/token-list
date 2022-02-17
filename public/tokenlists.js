function getListURLFromListID(listID) {
  if (listID.startsWith('https://')) {
    return listID
  } else if (listID.endsWith('.eth')) {
    // proxy http urls through a CF worker
    return `https://wispy-bird-88a7.uniswap.workers.dev/?url=${`http://${listID}.link`}`
  } else {
    throw Error(`Unrecognized listId ${listID}`)
  }
}

/*function getJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };

    try{
      xhr.send();
    }catch(ex){
      callback(ex, null);
    }
};*/

var request = require('request');

function getJSON(url, callback){
  request.get(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
          var csv = body;
          // Continue with your processing here.
          let data = JSON.parse(csv);
          callback(error, data)
      }
  });
}



let fallbackLogo = "https://raw.githubusercontent.com/feathericons/feather/master/icons/help-circle.svg";
let tokenLists = [];
let allTokens = {};

function processList(list){
  for(var t in list.tokens){
    let token = list.tokens[t];
    let existing = allTokens[token.address] || {};

    existing.name = token.name;
    existing.symbol = token.symbol;
    existing.address = token.address;
    existing.chainId = token.chainId;
    existing.logoURI = token.logoURI;
    existing.decimals = token.decimals;


    if(!existing.lists) existing.lists = {};
    existing.lists[list.name] = true;//{name:list.name};

    allTokens[token.address] = existing;
  }
}

function renderTokens(index){
  let list = tokenLists[index];
  let listHtml = "<table>";
  for(var t=0; t<list.tokens.length; t++){
    let token = list.tokens[t];
    let logo = token.logoURI || fallbackLogo;

    let listsTexts = [];
    let tokenInfo = allTokens[token.address];
    let lists = tokenInfo.lists;
    for(var l in lists){
      listsTexts.push(l);
    }

    listHtml += `<tr><td><img height=25 src="${logo}" /></td><td>${token.name} (${token.symbol}) <sup>${listsTexts.join(', ')}<sup></td></tr>`;
  }
  listHtml += "</table>";

  let container = document.getElementById('tokens');


  container.innerHTML = listHtml;
}

function rankTokens(chainId){
  let keys = Object.keys(allTokens);
  let values = [];
  for(var k in keys){
    let key = keys[k];
    if(allTokens[key].chainId != chainId) continue;
    values.push(allTokens[key]);
  }

  console.log("RANKING", values.length, "CHAIN", chainId)

  values.sort(function(firstEl, secondEl) {
    //console.log(Object.keys(firstEl.lists).length + " < " +  Object.keys(secondEl.lists).length)
    return Object.keys(firstEl.lists).length < Object.keys(secondEl.lists).length ? 1 : -1
  })

  //console.log("SORTED", values);

  return values;

  //let ranked = document.getElementById('ranked')
  //let result = {};

  for(var s in values){
    let tokenInfo = document.createElement('div');
    let listsTexts = [];
    for(var l in values[s].lists){
      listsTexts.push(l);
    }

    tokenInfo.innerHTML = "<b>"  + values[s].name + " (net:" + values[s].chainId + ")</b> " + Object.keys(values[s].lists).length + "(" + listsTexts.join(', ') + ")";
    ranked.appendChild(tokenInfo)
  }
}

function resolveLogoUri(uri){
  if(uri.startsWith("ipfs://")){
    let hash = uri.split("://")[1];
    return "https://ipfs.io/ipfs/" + hash;
  }
  return uri;
}

function renderLists(lists){

  let container = document.getElementById('lists');
  let listsHtml = "<table>";

  for(var i=0; i<lists.length; i++){
    let list = lists[i];
    let logo = resolveLogoUri(list.logoURI || fallbackLogo);

    //let nameDiv = document.createElement('div');
    listsHtml += `<tr style="cursor:hand;" onclick="renderTokens(${i})"><td><img height=25 src="${logo}" /></td><td>${list.name} (${list.tokens.length})</td></tr>`;


    //nameDiv.innerHTML = listHtml;
    //nameDiv.onclick = function(){
    //  renderTokens(list);
    //}
    //container.insertRow(nameDiv);
  }

  listsHtml += "</table>"

  container.innerHTML = listsHtml;
}

function getLists(chainId, cb){
  if(Object.keys(allTokens).length > 0){
    console.log("USING CACHED TOKENS")
    let ranked = rankTokens(chainId);
    console.log("RANKED", ranked.length)
    cb(ranked);
    return;
  }

  getJSON('https://raw.githubusercontent.com/Uniswap/tokenlists-org/master/src/token-lists.json', function(status, data){
    console.log("TOKEN LISTS", status, data);

    //cb(data);

    let lists = data;//JSON.parse(data);
    let keys = Object.keys(lists);

    console.log("LISTS", keys.length, keys);

    function loadList(i){
      if(!keys[i]){
        console.log("FINISHED LOADING LISTS")
        //renderLists(tokenLists);

        let ranked = rankTokens(chainId);
        console.log("RANKED", ranked.length)
        cb(ranked);
        return;
      }

      let url = getListURLFromListID(keys[i]);

      var skip = false;
      if(url.includes("0_0_0") || i == 12 || i == 20 || i == 22) skip = true;

      console.log("LOADING LIST", lists[keys[i]].name, i, "/", keys.length, keys[i], (url != keys[i] ? url : "") );

      if(!skip){
        getJSON(url, function(status, data){
          //console.log(status, data);
          console.log("LOADED", i, null);

          if(data){
            tokenLists.push(data);
            processList(data);
          }

          loadList(i+1);
        })
      }else{
        console.log("SKIPPING", i)
        loadList(i+1);
      }

    }

    loadList(0);
  })
}

module.exports = getLists;
