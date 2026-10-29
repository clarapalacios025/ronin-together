// Shared client/server validation. Keep display names short and readable.
const forbidden = /nigg|n1gg|niger|fagg|fag|chink|gook|kike|spic|wetback|coon|trann|retard|fuck|shit|bitch|cunt|cock|dick|pussy|asshole|bastard|motherf|whore|slut|nazi|hitler|heilhit|kkk|porn|rape|rapist|pedo|sex|suicide|kill.?yourself/;
export function validateUsername(value){
 if(typeof value!=='string')return {error:'Enter a username.'};
 const name=value.normalize('NFKC').trim();
 if(!name)return {name:'Wanderer'};
 if(name.length<2||name.length>20)return {error:'Use 2–20 characters for your username.'};
 if(!/^[a-zA-Z0-9 _.-]+$/.test(name))return {error:'Use English letters, numbers, spaces, dots, underscores or hyphens.'};
 const plain=name.toLowerCase().replace(/[^a-z0-9]/g,'');
 const decoded=plain.replace(/[0134578]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b'}[c]));
 if([plain,decoded,decoded.replace(/(.)\1+/g,'$1')].some(text=>forbidden.test(text)))return {error:'Please choose a different, respectful username.'};
 return {name};
}
export const usernameColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:'#fff0cf';
