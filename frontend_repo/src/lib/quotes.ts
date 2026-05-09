export const fetchFortune = async () => {
  try {
    // Using a reliable no-auth public API
    const response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://zenquotes.io/api/random'));
    const data = await response.json();
    const quoteData = JSON.parse(data.contents)[0];
    return {
      text: quoteData.q,
      author: quoteData.a
    };
  } catch (error) {
    console.warn("Quote API failed, using fallback:", error);
    return {
      text: "Luck is what happens when preparation meets opportunity.",
      author: "Seneca"
    };
  }
};
