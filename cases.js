// Hand-written cases for the prototype. A case is valid when the culprit satisfies every
// clue and the full clue set leaves exactly one suspect (checked by validate.js).
// A clue says: the culprit's <axis> is (or, with not:true, is NOT) <value>.
(function (root) {
  const CASES = [
    {
      title: "The Stolen Pie",
      intro: "The Harvest Fair's prize pie vanished from the bakery window minutes before the judging.",
      axes: [
        { key: "wear", label: "Clothing" },
        { key: "feet", label: "Footwear" },
        { key: "spot", label: "Last seen" },
      ],
      suspects: [
        { name: "Marta", emoji: "👵", line: "I was nowhere near that pie.", wear: "red scarf", feet: "muddy boots", spot: "garden" },
        { name: "Odell", emoji: "🧔", line: "Pie? I'm more of a cake man.", wear: "red scarf", feet: "clean sneakers", spot: "cellar" },
        { name: "Priya", emoji: "👩‍🍳", line: "Ask anyone, I never left my station.", wear: "green apron", feet: "muddy boots", spot: "cellar" },
        { name: "Quill", emoji: "🧑‍🌾", line: "Pies make me nervous, honestly.", wear: "green apron", feet: "clean sneakers", spot: "garden" },
        { name: "Rosa", emoji: "👩‍🦳", line: "Is that crumbs on your sleeve? No? Oh.", wear: "blue hat", feet: "muddy boots", spot: "porch" },
      ],
      culprit: 2,
      clues: [
        { place: "Window latch", axis: "wear", value: "green apron", text: "A scrap of green apron fabric is snagged on the window latch." },
        { place: "Windowsill", axis: "feet", value: "muddy boots", text: "Muddy bootprints cross the windowsill, and only the windowsill." },
        { place: "Neighbor", axis: "spot", value: "garden", not: true, text: "Everyone in the garden was in plain view of the neighbor all morning. The thief wasn't there." },
        { place: "Cellar door", axis: "spot", value: "cellar", text: "The cellar door is unlocked, and there are fresh crumbs on the stairs." },
      ],
    },
    {
      title: "The Missing Telescope",
      intro: "The school observatory club's brand-new telescope has walked out of the locked supply room.",
      axes: [
        { key: "wear", label: "Clothing" },
        { key: "carry", label: "Carrying" },
        { key: "spot", label: "Last seen" },
      ],
      suspects: [
        { name: "Ben", emoji: "🧒", line: "I was stargazing, on the roof. Obviously.", wear: "yellow raincoat", carry: "backpack", spot: "roof" },
        { name: "Chloe", emoji: "👧", line: "Telescopes are boring. Mostly.", wear: "yellow raincoat", carry: "umbrella", spot: "library" },
        { name: "Dev", emoji: "🧑‍🎓", line: "Library, all day. Ask the librarian.", wear: "grey hoodie", carry: "backpack", spot: "library" },
        { name: "Esme", emoji: "👩‍🎓", line: "I was eating. That's it. That's the alibi.", wear: "grey hoodie", carry: "umbrella", spot: "cafeteria" },
        { name: "Finn", emoji: "🧑‍🎤", line: "Did someone say telescope?", wear: "striped scarf", carry: "backpack", spot: "cafeteria" },
      ],
      culprit: 2,
      clues: [
        { place: "Security camera", axis: "wear", value: "grey hoodie", text: "A blurry frame shows a grey hoodie slipping out of the supply room." },
        { place: "Supply room floor", axis: "carry", value: "backpack", text: "The dust shows a long case was slid into something that sagged under the weight: a backpack." },
        { place: "Hall monitor", axis: "spot", value: "library", text: "The hall monitor saw the culprit heading toward the library afterward." },
        { place: "Rooftop", axis: "spot", value: "roof", not: true, text: "The roof door is rusted shut. Nobody has been up there in weeks." },
      ],
    },
    {
      title: "The Library Cat Escape",
      intro: "Whiskers, the beloved library cat, is out in the street, and someone propped the back door open.",
      axes: [
        { key: "hold", label: "Holding" },
        { key: "feet", label: "Footwear" },
        { key: "time", label: "Arrived" },
      ],
      suspects: [
        { name: "Ada", emoji: "👩‍💼", line: "I came in with the sunrise crowd.", hold: "coffee", feet: "red sneakers", time: "early" },
        { name: "Bo", emoji: "🧔‍♂️", line: "I stayed till they kicked me out.", hold: "coffee", feet: "boots", time: "closing" },
        { name: "Cy", emoji: "🧑‍💻", line: "Cats? I'm allergic. Why would I?", hold: "book", feet: "red sneakers", time: "noon" },
        { name: "Di", emoji: "👩‍🏫", line: "Back door? There's a back door?", hold: "book", feet: "sandals", time: "early" },
        { name: "Eli", emoji: "👨‍🔧", line: "Just fixing the heater, ma'am.", hold: "keys", feet: "boots", time: "noon" },
      ],
      culprit: 2,
      clues: [
        { place: "Back door", axis: "hold", value: "book", text: "A library book was left wedged in the door to keep it open." },
        { place: "Parking lot", axis: "feet", value: "red sneakers", text: "Squeaky red sneaker prints lead from the back door to the street." },
        { place: "Sign-in sheet", axis: "time", value: "noon", text: "The sign-in sheet shows the culprit arrived right around lunchtime." },
        { place: "Staff room", axis: "time", value: "early", not: true, text: "The early crowd was all in the staff room's meeting at the time. Not them." },
      ],
    },
    {
      title: "The Garden Gnome Heist",
      intro: "Every gnome on Maple Street has vanished overnight, except one, left grinning in the middle of the road.",
      axes: [
        { key: "hat", label: "Hat" },
        { key: "smell", label: "Smell" },
        { key: "ride", label: "Getting around" },
      ],
      suspects: [
        { name: "Gus", emoji: "👴", line: "Gnomes are the best neighbors, quiet.", hat: "straw hat", smell: "mint", ride: "bike" },
        { name: "Hana", emoji: "👩‍🎨", line: "I was painting. Painting is my whole thing.", hat: "straw hat", smell: "paint", ride: "scooter" },
        { name: "Ivo", emoji: "🧑‍🍳", line: "Mint tea. Lots of it. Unrelated.", hat: "beret", smell: "mint", ride: "scooter" },
        { name: "Jo", emoji: "🧓", line: "Back in my day we stole garden hoses.", hat: "beret", smell: "smoke", ride: "on foot" },
        { name: "Kai", emoji: "🧑‍🎨", line: "I think the gnomes left on their own.", hat: "bucket hat", smell: "paint", ride: "bike" },
      ],
      culprit: 2,
      clues: [
        { place: "Lawn", axis: "hat", value: "beret", text: "A tiny beret feather is stuck in a trampled flowerbed." },
        { place: "Mailbox", axis: "smell", value: "mint", text: "The gnome in the road smells strongly of fresh mint." },
        { place: "Tire tracks", axis: "ride", value: "scooter", text: "Two narrow wheel tracks, far too small for a bike, run down the sidewalk." },
        { place: "Bike rack", axis: "ride", value: "bike", not: true, text: "The bike rack hasn't been touched, and its dew-covered locks are still shut." },
      ],
    },
    {
      title: "The Midnight Snack Raid",
      intro: "Someone emptied the dorm's shared snack shelf overnight, and left everyone's name labels behind.",
      axes: [
        { key: "sound", label: "Sound" },
        { key: "wear", label: "Clothing" },
        { key: "trail", label: "Left behind" },
      ],
      suspects: [
        { name: "Lena", emoji: "👩", line: "I sleep like a log. A quiet log.", sound: "humming", wear: "striped pajamas", trail: "crumbs" },
        { name: "Max", emoji: "👨", line: "Snacks? I'm on a strict diet.", sound: "humming", wear: "bathrobe", trail: "wrapper" },
        { name: "Nia", emoji: "🧑", line: "I was dreaming about a sandwich. Sorry.", sound: "whistling", wear: "striped pajamas", trail: "wrapper" },
        { name: "Omar", emoji: "🧑‍🦱", line: "If I took it, would I be awake right now?", sound: "whistling", wear: "fuzzy slippers", trail: "crumbs" },
        { name: "Pia", emoji: "👩‍🦰", line: "I heard everything and saw nothing.", sound: "sneezing", wear: "bathrobe", trail: "sticky prints" },
      ],
      culprit: 2,
      clues: [
        { place: "Hallway", axis: "sound", value: "whistling", text: "A night owl heard tuneless whistling drifting past the common room." },
        { place: "Door frame", axis: "wear", value: "striped pajamas", text: "A thread of striped flannel is caught on the shelf door." },
        { place: "Trash can", axis: "trail", value: "wrapper", text: "A fresh pile of empty wrappers is stuffed in the trash, no crumbs anywhere." },
        { place: "Common room", axis: "trail", value: "crumbs", not: true, text: "The crumb trail on the carpet is from last week's party, not tonight." },
      ],
    },
    {
      title: "Who Cancelled Movie Night?",
      intro: "Thirty people showed up. The projector was unplugged, the popcorn was missing, and the screen had a mustache.",
      axes: [
        { key: "seat", label: "Seat" },
        { key: "snack", label: "Snack" },
        { key: "coat", label: "Coat" },
      ],
      suspects: [
        { name: "Quinn", emoji: "🧑‍🚀", line: "Front row. Best seat. Obviously.", seat: "front row", snack: "popcorn", coat: "red jacket" },
        { name: "Rui", emoji: "🧑‍🎓", line: "I only came for the trailers.", seat: "front row", snack: "candy", coat: "denim" },
        { name: "Sol", emoji: "🧑‍🎤", line: "Honestly, the film was never going to be good.", seat: "back row", snack: "popcorn", coat: "denim" },
        { name: "Tess", emoji: "👩‍🚀", line: "I was getting nachos. Ask the nachos.", seat: "back row", snack: "nachos", coat: "red jacket" },
        { name: "Uma", emoji: "👩‍🎤", line: "I'd never wreck a good movie night.", seat: "aisle", snack: "candy", coat: "plaid" },
      ],
      culprit: 2,
      clues: [
        { place: "Projector booth", axis: "seat", value: "back row", text: "Footprints and a half-eaten kernel in the projector booth, right behind the back row." },
        { place: "Popcorn machine", axis: "snack", value: "popcorn", text: "The popcorn machine is spotless. The culprit cleaned out every last kernel." },
        { place: "Coat rack", axis: "coat", value: "denim", text: "A denim jacket sleeve is caught on the screen's mustache marker." },
        { place: "Concession stand", axis: "snack", value: "candy", text: "The candy stash is fully intact, so no candy lover did this.", not: true },
      ],
    },
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = CASES;
  else root.CASES = CASES;
})(typeof window !== "undefined" ? window : globalThis);
