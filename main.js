const fs = require("fs");
const http = require("http");
const fetch = require("node-fetch");
const filePath = "data.txt";
const apiKey = 'dict.1.1.20170610T055246Z.0f11bdc42e7b693a.eefbde961e10106a4efa7d852287caa49ecc68cf';

// Method to fetch document and cache in local
function writeToFile() {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        http.get("http://norvig.com/big.txt", response => {
            var stream = response.pipe(file);
            stream.on("finish" , () => resolve());
            stream.on("error" , () => reject());
        })
    }).catch((error) => console.log(`ERROR!! in writeToFile ${error}`));
}

// Method to split the words and return a collection of words and their no of occurences
async function makeCollection(paragraph) {
    var wordsCollection = {};
    // Split string by spaces
    var wordsArray = paragraph.split(/\s+/);
 
    wordsArray.forEach(function (key) {
        key = key.toLowerCase(); // words can be both UC or LC
        if (wordsCollection.hasOwnProperty(key)) {
            wordsCollection[key]++;
        } else {
            wordsCollection[key] = 1;
        }
      });
    return wordsCollection;
}


// Method to sort the collection and return the top ten words
async function topTenWords(wordsMap) {
    // sort by count in descending order
    try {
        var finalWordsArray = [];
        finalWordsArray = await Object.keys(wordsMap).map(function(key) {
            return { word: key, count: wordsMap[key] };
        });
    
       //console.log(finalWordsArray);
        finalWordsArray = await finalWordsArray.sort(function(a, b) {
            return b.count - a.count;
        });

        //console.log(sortedWordsArray);
        return finalWordsArray.slice(0, 10);

    } catch(error) {
        console.log(`ERROR!! in topTenWords ${error}`);
    }
}


// Function to display the output
function displayResults(results) {
    let finalResult = [];
    results.forEach(result => {
        // console.log(result);
        const output = {};
        // Check the API response has values, show default values otherwise
        if (result.def.length) { 
            if(result.def[0].hasOwnProperty('text')){
                output['word']  =  result.def[0]['text'];
            } else {
                output['word']  =  result.word;
            }

            if(result.def[0].hasOwnProperty('pos')){
                output['pos']  =  result.def[0]['pos'];
            }
            
            output['count'] =  result.count;
            if(result.def[0].hasOwnProperty('tr')) {
                let synonyms = [];
                result.def[0]['tr'].forEach(element => {
                    if(element.hasOwnProperty('text')) {
                        synonyms.push({'text': element.text});
                    }
                });
                output['synonyms'] = synonyms;
            }
            
        } else { 
            output['word']      =  result.word;
            output['count']     =  result.count;
            output['pos']       =  'NA';
            output['synonyms']  =  'NA';
        }
        finalResult.push(output);
    });

    console.log(JSON.stringify(finalResult, null, 2));
}

// Method to fetch the pos/synonyms from API
// callDictionaryAPI function using async/ await
async function callDictionaryAPI(tenWords) {
    await Promise.all(tenWords.map(async word => {
        const response = await fetch(`https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${apiKey}&lang=en-en&text=${word.word}`);
        const dict = await response.json();
        dict['count'] = word.count;
        dict['word'] = word.word;
    //   await displayResults(dict);
        return dict;
        
    }))
    .then(response => displayResults(response))
    .catch((error) => console.log(`ERROR!! in callDictionaryAPI ${error}`))
}


// Method to fetch the pos/synonyms from API
// callDictionaryAPI function with promises 
function callDictionaryAPIPromise(tenWords) {
    return Promise.all(
        tenWords.map(word => fetch(`https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${apiKey}&lang=en-en&text=${word}`)
        .then(response => response.json())
        .then(data => displayResults(data))
        .catch(error => (console.log(error)))
      )
    )
  }

// Method to read file and further processing.
function iterateFile() {
    // Read file from current directory
    fs.readFile(filePath, 'utf8', function (error, content) {

        if (error) throw error;
        // makeCollection() method is responsible for parsing the text into words by spliting spaces, tabs etc.
        // makeCollection() will return collection of words and their number of occurences
        // topTenWords() will return an array of top ten words based on their occurence
        // callDictionaryAPI is called to find the pos and synonyms from the given API and print the results
        makeCollection(content)
            .then(wordsMap => topTenWords(wordsMap))
            .then(response => callDictionaryAPI(response))
            .catch(error => console.log(`ERROR!! in iterateFile ${error}`));
    
    });
}

/////////////////////////////////////////////////////////
////////////////////////// MAIN ////////////////////////
///////////////////////////////////////////////////////
try {
    // Check big.txt file is available in local, if not fetch it and store it localy
    if (!fs.existsSync(filePath)) {
        writeToFile()
            .then(iterateFile)
            .catch(error => console.log(`ERROR!! in writeToFile ${error}`));
    } else {
        iterateFile();
    }
} catch(err) {
    console.error(err);
}



