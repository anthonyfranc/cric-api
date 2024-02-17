const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const googleNewsScraper = require('google-news-scraper');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', async(req, res)=>{
    try {
        res.json("Hello! Thank you for checking out. I am working !!");
    } catch (error) {
        console.error('Error:', error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
})

// Define API endpoints
app.get('/matches', async (req, res) => {
    try {
        // Scrape live score data from Cricbuzz
        const response = await axios.get('https://www.cricbuzz.com/');
        const $ = cheerio.load(response.data);
    
        // Target the match containers
        const matchContainers = $('ul.cb-col.cb-col-100.videos-carousal-wrapper.cb-mtch-crd-rt-itm').find('.cb-view-all-ga.cb-match-card.cb-bg-white');
    
        let matches = [];
    
        // Loop through each match container
        matchContainers.each((index, container) => {
            let match = {};
    
            // Extract match details
            const matchDetails = $(container).find('.cb-mtch-crd-hdr').text().trim().split(' • ');
            match['tournament'] = matchDetails[0];
            match['format'] = matchDetails[1];
    
            // Extract match ID from URL
            const matchLink = $(container).find('a').attr('href');
            match['matchId'] = matchLink.split('/')[2];
            match['matchSlug'] = matchLink.split('/')[3];
    
            // Extract team details
            const team1Name = $(container).find('.cb-hmscg-tm-bat-scr .text-normal').eq(0).text();
            const team1Score = $(container).find('.cb-hmscg-tm-bat-scr .cb-col-50').eq(1).text().trim();
            match['team1'] = {
                'name': team1Name,
                'score': team1Score
            };
    
            const team2Name = $(container).find('.cb-hmscg-tm-bwl-scr .text-normal').eq(0).text();
            const team2Score = $(container).find('.cb-hmscg-tm-bwl-scr .cb-col-50').eq(1).text().trim();
            match['team2'] = {
                'name': team2Name,
                'score': team2Score
            };
    
            // Extract match status
            match['status'] = $(container).find('.cb-mtch-crd-state').text().trim();
    
            // Add match to array
            matches.push(match);
        });
    
        // Log the formatted JSON data
        console.log(JSON.stringify(matches, null, 2));
    
        // Respond with the JSON data
        res.json(matches);
    } catch (error) {
        // Handle errors
        console.error('Error:', error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});

app.get('/live-cricket-score/:matchId/:matchSlug', async (req, res) => {
    try {
        const matchId = req.params.matchId;
        const matchSlug = req.params.matchSlug;
        const response = await axios.get(`https://www.cricbuzz.com/live-cricket-scores/${matchId}/${matchSlug}`);
        const $ = cheerio.load(response.data);

        const data = {};

        data.batting = $('.cb-min-bat-rw .cb-font-20').text().trim();
        data.bowling = $('.cb-min-bat-rw .cb-text-gray').text().trim();

        data.batsmen = [];
        $('.cb-min-inf').eq(0).find('.cb-min-itm-rw').each((index, element) => {
            const batsman = {};
            batsman.name = $(element).find('.cb-text-link').text().trim();
            batsman.runs = $(element).find('.cb-col:nth-child(2)').text().trim();
            batsman.balls = $(element).find('.cb-col:nth-child(3)').text().trim();
            batsman.fours = $(element).find('.cb-col:nth-child(4)').text().trim();
            batsman.sixes = $(element).find('.cb-col:nth-child(5)').text().trim();
            batsman.strikeRate = $(element).find('.cb-col:nth-child(6)').text().trim();
            if (batsman.name !== "") {
                data.batsmen.push(batsman);
            }
        });

        data.bowlers = [];
        $('.cb-min-inf').eq(1).find('.cb-min-itm-rw').each((index, element) => {
            const bowler = {};
            bowler.name = $(element).find('.cb-text-link').text().trim();
            bowler.overs = $(element).find('.cb-col:nth-child(2)').text().trim();
            bowler.maidens = $(element).find('.cb-col:nth-child(3)').text().trim();
            bowler.runs = $(element).find('.cb-col:nth-child(4)').text().trim();
            bowler.wickets = $(element).find('.cb-col:nth-child(5)').text().trim();
            bowler.economy = $(element).find('.cb-col:nth-child(6)').text().trim();
            if (bowler.name !== "") {
                data.bowlers.push(bowler);
            }
        });

        res.json(data);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});


app.get('/live-cricket-scorecard-batter/:matchId/:matchSlug', async (req, res) => {
    try {
        const matchId = req.params.matchId;
        const matchSlug = req.params.matchSlug;
        const response = await axios.get(`https://www.cricbuzz.com/live-cricket-scorecard/${matchId}/${matchSlug}`);
        const $ = cheerio.load(response.data);

        const inningsData = [];
        $('.cb-col-100.cb-scrd-itms').each((index, element) => {
            const batsman = $(element).find('.cb-col.cb-col-25 a').text().trim();
            const dismissalInfo = $(element).find('.cb-col.cb-col-33 span').text().trim();
            const runs = $(element).find('.cb-col.cb-col-8.text-right.text-bold').eq(0).text().trim();
            const balls = $(element).find('.cb-col.cb-col-8.text-right').eq(1).text().trim();
            const fours = $(element).find('.cb-col.cb-col-8.text-right').eq(2).text().trim();
            const sixes = $(element).find('.cb-col.cb-col-8.text-right').eq(3).text().trim();
            const strikeRate = $(element).find('.cb-col.cb-col-8.text-right').eq(4).text().trim();
            if (batsman !== ''){
                inningsData.push({
                batsman,
                dismissalInfo,
                runs,
                balls,
                fours,
                sixes,
                strikeRate
            });
            }
            
        });

        const extras = [$('.cb-col-32.cb-col').eq(0).text().trim(), $('.cb-col.cb-col-8.text-bold.cb-text-black.text-right').text().trim()];
        const total = [$('.cb-col-32.cb-col').eq(1).text().trim(), $('.cb-col.cb-col-8.text-bold.text-black.text-right').text().trim()];
        const yetToBat = $('.cb-col.cb-col-100.cb-scrd-itms').children('.cb-col-73.cb-col').text().trim().split(',').map(item => item.trim());

        res.json({
            inningsData,
            extras,
            total,
            yetToBat
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});


app.get('/live-cricket-scorecard-wickets/:matchId/:matchSlug', async (req, res) => {
    try {
        const matchId = req.params.matchId;
        const matchSlug = req.params.matchSlug;
        const response = await axios.get(`https://www.cricbuzz.com/live-cricket-scorecard/${matchId}/${matchSlug}`);
        const $ = cheerio.load(response.data);

        // Extracting wicket data from the content
        const wicketsData = [];
        $('.cb-col.cb-col-100.cb-col-rt.cb-font-13 span').each((index, element) => {
            const text = $(element).text().trim();
            const parts = text.split('(');
            const score = parts[0].trim();
            const playerParts = parts[1].split(',');
            const player = playerParts[0].trim();
            const ballsFaced = playerParts[1].replace(')', '').trim();
            wicketsData.push({ score, player, ballsFaced });
        });

        res.json({ wickets: wicketsData });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});

app.get('/live-cricket-scorecard-bowler/:matchId/:matchSlug', async (req, res) => {
    try {
        const matchId = req.params.matchId;
        const matchSlug = req.params.matchSlug;
        const response = await axios.get(`https://www.cricbuzz.com/live-cricket-scorecard/${matchId}/${matchSlug}`);
        const $ = cheerio.load(response.data);

        const bowlers = [];
        
        $('.cb-col-100.cb-scrd-itms').each((index, element) => {
            const $element = $(element);
            const bowlerName = $element.find('.cb-col.cb-col-38 a').text().trim();
            const overs = $element.find('.cb-col.cb-col-8:nth-child(2)').text().trim();
            const maidens = $element.find('.cb-col.cb-col-8:nth-child(3)').text().trim();
            const runs = $element.find('.cb-col.cb-col-10:nth-child(4)').text().trim();
            const wickets = $element.find('.cb-col.cb-col-8:nth-child(5)').text().trim();
            const noBalls = $element.find('.cb-col.cb-col-8:nth-child(6)').text().trim();
            const wides = $element.find('.cb-col.cb-col-8:nth-child(7)').text().trim();
            const economy = $element.find('.cb-col.cb-col-10:nth-child(8)').text().trim();

            const bowler = {
                name: bowlerName,
                overs: overs,
                maidens: maidens,
                runs: runs,
                wickets: wickets,
                noBalls: noBalls,
                wides: wides,
                economy: economy
            };

            if (bowlerName !== ''){
                bowlers.push(bowler);
            }
            
        });
        
        res.json({ bowlers });

        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});

app.get('/live-cricket-match-info/:matchId/:matchSlug', async (req, res) => {
    try {
        const matchId = req.params.matchId;
        const matchSlug = req.params.matchSlug;
        const response = await axios.get(`https://www.cricbuzz.com/live-cricket-scorecard/${matchId}/${matchSlug}`);
        const $ = cheerio.load(response.data);

        // Extracting match information
        const matchInfo = {};
        $('.cb-col-100.cb-mtch-info-itm').each((index, element) => {
            const key = $(element).find('.cb-col-27').text().trim();
            const value = $(element).find('.cb-col-73').text().trim();
            matchInfo[key] = value;
        });

        // Sending formatted data as JSON response
        res.json({
            matchInfo: matchInfo
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});

app.get('/live-cricket-match-squad/:matchId/:matchSlug', async (req, res) => {
    try {
      const matchId = req.params.matchId;
      const matchSlug = req.params.matchSlug;
      
      const response = await axios.get(`https://www.cricbuzz.com/cricket-match-squads/${matchId}/${matchSlug}`);
      const $ = cheerio.load(response.data); 
  
      const squads = {
        playingXI: [],
        bench: [],
        supportStaff: []
      };
  
      // Extract playing XI 
      $('.cb-col-100.ng-scope').each((_, el) => {
        const name = $(el).find('.cb-player-name-left, .cb-player-name-right').text().trim();
        const role = $(el).find('.text-gray').eq(0).text().trim();
        const isSubstitute = $(el).find('.cbPlusIco').length > 0;
  
        squads.playingXI.push({
          name,
          role, 
          isSubstitute
        });
      });
  
      // Extract bench
      $(`.cb-col.cb-play11-lft-col + div`).each((_, el) => {
        const name = $(el).find('.cb-player-name-left').eq(0).text().trim(); 
        const role = $(el).find('.text-gray').eq(0).text().trim();
        
        squads.bench.push({
          name,
          role
        }); 
      });
  
      // Extract support staff
      $('.cb-play-staff > div').each((_, el) => {
        const name = $(el).find('.cb-player-name-left, .cb-player-name-right').eq(0).text().trim();
        const role = $(el).find('.text-gray').eq(0).text().trim();
        
        if(name) {
          squads.supportStaff.push({
            name, 
            role
          });
        }
      });
  
      res.json(squads);
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

app.get('/live-cricket-match-info-online/:matchId/:matchSlug', async (req, res) => {
    try {
        const matchId = req.params.matchId;
        const matchSlug = req.params.matchSlug;
        const response = await axios.get(`https://www.cricbuzz.com/cricket-match-squads/${matchId}/${matchSlug}`);
        const $ = cheerio.load(response.data);

        // Extracting match information
        const matchInfo = {};
        $('.cb-col').each((index, element) => {
            const label = $(element).find('.cb-mat-fct-itm').eq(0).text().trim();
            const value = $(element).find('.cb-mat-fct-itm').eq(1).text().trim();
            matchInfo[label] = value;
        });

        // Format the match information into desired API response
        const formattedMatchInfo = {
            match: matchInfo['Match:'],
            date: matchInfo['Date:'],
            toss: matchInfo['Toss:'],
            time: matchInfo['Time:'],
            venue: matchInfo['Venue:'],
            umpires: matchInfo['Umpires:'],
            thirdUmpire: matchInfo['Third Umpire:'],
            matchReferee: matchInfo['Match Referee:']
        };

        // Send the formatted match information as API response
        res.json(formattedMatchInfo);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(error.response ? error.response.status : 500).json({ error: 'Failed to fetch match information' });
    }
});

app.get('/fetch-news/:matchSlug', async (req, res) => {
    try {
        const RawMatchSlug = req.params.matchSlug;
        const matchSlug = RawMatchSlug.replaceAll('-',' ');

        const articles = await googleNewsScraper({
            searchTerm: `${matchSlug}`,
            prettyURLs: false,
            queryVars: {
                hl:"en-US",
                gl:"US",
                ceid:"US:en"
              },
            timeframe: "1d",
            puppeteerArgs: ["--no-sandbox", "--disable-setuid-sandbox"]
        })

        res.json(articles);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/fetch-news-all', async (req, res) => {
    try {
        const articles = await googleNewsScraper({
            searchTerm: `Cricket News`,
            prettyURLs: false,
            queryVars: {
                hl:"en-US",
                gl:"US",
                ceid:"US:en"
              },
            timeframe: "12h",
            puppeteerArgs: ["--no-sandbox", "--disable-setuid-sandbox"]
        })

        res.json(articles);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;