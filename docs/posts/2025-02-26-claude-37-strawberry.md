---
tags:
    - blog
    - llm
    - claude
    - date/2025/02/26
date: 2025-02-26
---
# Antropics Claude 3.7 Sonnet is released

Yesterday, Anthropic released their new LLM, [Claude 3.7 Sonnet](http://www.anthropic.com/news/claude-3-7-sonnet).

For a run-through of the vibes, I always wait for [Zvi Mowshowitz](https://thezvi.substack.com/p/time-to-welcome-claude-37/)'s review.

However, there are a few fun highlights here. 

## ClaudePlaysPokemon

Back in the pre-historic era when I was at Uni, I lost a lot of time to [Twitch Plays Pokemon](https://en.wikipedia.org/wiki/Twitch_Plays_Pok%C3%A9mon).
I was facinated by the idea of a collective playing a game, and the chaos that ensued. A whole mythos got built up, and it was a lot of fun to follow and occasionally spam in the chat. 

Anthropic has started using "How far can Claude get in Pokemon" as one of their benchmarks, but they have also set up an emulator streaming on Twitch.

![Claude can get Surges Badge](../images/claude-pokemon.png)

You can watch [ClaudePlaysPokemon](https://www.twitch.tv/claudeplayspokemon) and see how far the model can get.

## How many "R"s in Strawberry?

There is an easter egg in the system prompt, where if you ask "How many R's in Strawberry?" it will generate a little website that counts the number of R's in the word strawberry.

I have pasted the HTML directly below (simultaneously testing how markdown with HTML gets handled by MkDocs)


<!DOCTYPE html>
<html>
<body>
  <!-- Strawberry Counter (isolated styling) -->
  <div style="text-align: center; padding: 20px; margin: 20px auto; max-width: 400px;">
    <div id="strawberry" style="font-size: 60px; cursor: pointer; margin-bottom: 10px;">🍓</div>
    <div id="click-text" style="font-size: 16px;">Click the strawberry to count!</div>
    <div id="word" style="font-size: 28px; margin: 20px 0; visibility: hidden;"></div>
    <div id="result" style="font-size: 20px; font-weight: bold; color: #e53e3e; visibility: hidden;"></div>
  </div>

  <!-- Add the keyframes for bounce animation -->
<style>
  @keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-5px); }
  }
</style>

<script>
    const word = "strawberry";
    const wordElement = document.getElementById("word");
    const resultElement = document.getElementById("result");
    const strawberryElement = document.getElementById("strawberry");
    const clickTextElement = document.getElementById("click-text");
    
    // Calculate the number of Rs
    const rCount = word.split('').filter(letter => 
      letter.toLowerCase() === 'r'
    ).length;
    
    // Set up the click event
    strawberryElement.addEventListener("click", function() {
      // Hide the click text
      clickTextElement.style.display = "none";
      
      // Create the letter-by-letter display
      wordElement.innerHTML = "";
      for(let i = 0; i < word.length; i++) {
        const letterSpan = document.createElement("span");
        letterSpan.textContent = word[i];
        letterSpan.style.display = "inline-block";
        letterSpan.style.margin = "0 2px";
        
        if(word[i].toLowerCase() === 'r') {
          letterSpan.style.color = "#e53e3e";
          letterSpan.style.fontWeight = "bold";
          // Add bounce animation with inline styling
          letterSpan.style.animation = "bounce 0.5s infinite alternate";
          letterSpan.style.display = "inline-block";
        }
        
        wordElement.appendChild(letterSpan);
      }
      
      // Show the word and result
      wordElement.style.visibility = "visible";
      resultElement.textContent = `There are ${rCount} R's in strawberry!`;
      resultElement.style.visibility = "visible";
    });
  </script>
</body>
</html>