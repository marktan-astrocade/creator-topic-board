# Source of truth for the 100 creator topics. Run to regenerate data/topics.base.json
import json
C = []  # (category, ship_by, [(id, title, desc), ...])
C.append(("Thanksgiving", "2026-11-15", [
 ("turkey-thaw", "Turkey Thaw Panic", "It's the night before Thanksgiving and the turkey is still frozen solid. Rotate it through the sink, fridge and hair dryer to thaw it in time without serving it raw."),
 ("turkey-carving", "Turkey Carving Slicer", "Slice the roast turkey along the dotted lines while Grandma watches from across the table. Clean cuts earn compliments, mangled slices earn sighs."),
 ("plate-stacker", "Thanksgiving Plate Stacker", "Pile turkey, stuffing, mashed potatoes, green bean casserole and cranberry sauce onto one paper plate before it buckles. Gravy flows downhill."),
 ("parade-balloon", "Parade Balloon Wrangler", "Steer a giant cartoon balloon down a big-city parade route in gusty wind. Keep it off the lampposts and the crowd cheering."),
 ("turkey-trot", "Turkey Trot 5K", "Run the Thanksgiving morning 5K in a turkey hat. Dodge strollers, dogs and costumed runners to beat your neighbor to the finish line."),
 ("run-turkey-run", "Run, Turkey, Run", "You are the turkey, and it's the week before Thanksgiving. Escape the farm, dodge the farmer and hide in plain sight until the holiday passes."),
 ("food-coma-football", "Food Coma Football", "Stay awake on the couch through the Thanksgiving football game. Tap to fight the food coma. Every touchdown buys you a few more seconds."),
 ("pie-slicer", "Fair Pie Slices", "Cut the pumpkin pie into equal slices for nine cousins. Uneven slices start a family feud, perfect slices earn whipped cream."),
]))
C.append(("Holiday shopping", "2026-11-20", [
 ("doorbuster-dash", "Doorbuster Dash", "Doors open at 5 a.m. on Black Friday. Sprint the big-box aisles, grab the half-price TV and dodge the stampede of shopping carts."),
 ("cyber-monday-checkout", "Cyber Monday Checkout", "Deals flash on screen for a second. Tap add to cart before they sell out and check out before the countdown hits zero."),
 ("free-sample-sprint", "Free Sample Sprint", "Hit every free-sample stand in a giant warehouse store before closing time. Grab every sample, buy nothing, and don't get caught going back twice."),
 ("mall-parking", "Mall Parking Hunter", "It's the holiday rush and nobody is leaving. Circle the packed mall lot and steal the open spot before another minivan does."),
 ("returns-line", "Returns Line Survivor", "It's the day after Christmas and the returns line wraps around the store. Inch forward, juggle receipts and gift bags, and don't lose your spot.", "2026-12-20"),
]))
C.append(("Winter holidays", "2026-12-01", [
 ("advent-calendar", "24-Day Advent Calendar", "A new door opens every day of December with a tiny game behind it. Built to bring players back every day until Christmas Eve."),
 ("cookie-exchange", "Cookie Exchange Bake-Off", "Bake and decorate holiday cookies, then trade plates at the neighborhood cookie exchange. Keep a few hidden for Santa."),
 ("ugly-sweater", "Ugly Sweater Contest", "Design the tackiest holiday sweater with reindeer, pom-poms and blinking lights, then strut it at the office party for the crowd vote."),
 ("tree-lot-tycoon", "Christmas Tree Lot Tycoon", "Run a roadside Christmas tree lot. Haggle prices, net the trees and tie them onto car roofs before the snow comes."),
 ("tree-on-roof", "Tree on the Roof", "Drive home with a giant Christmas tree strapped to the car roof. Take the turns gently or it slides off into traffic."),
 ("gingerbread-house", "Gingerbread House Builder", "Stack gingerbread walls and a roof with icing glue, then pile on the candy. Build it tall before it collapses."),
 ("porch-pirate-defense", "Porch Pirate Defense", "Protect the packages on your front porch with sprinklers, a barking dog and glitter bombs. Tower defense on a snowy suburban street."),
 ("out-light-neighbors", "Out-Light the Neighbors", "Cover your house in holiday lights to beat the neighbor's display. Add too many and you blow the breaker for the whole block."),
 ("chimney-drop", "Chimney Drop", "Slide down ten chimneys and fill the stockings by the fireplace without waking the dog or the kids."),
 ("sledding-hill", "Sledding Hill Wipeout", "Ragdoll sled run down a snowy neighborhood hill. Dodge the mailbox, hit the jump and beat your best distance."),
 ("dreidel-latke", "Dreidel Spin and Latke Flip", "Spin the dreidel to win chocolate coins, then flip latkes in the pan before they burn. Hanukkah runs Dec 4 to 12 this year."),
 ("ball-drop", "New Year's Ball Drop", "Time your tap to the midnight countdown as the giant crystal ball drops over Times Square. Perfect timing sets off the confetti.", "2026-12-20"),
]))
C.append(("Big game season", None, [
 ("rivalry-tug", "Rivalry Week Tug-of-War", "Two rival college campuses, one rope. Tap in rhythm with your marching band to drag the other side across the line during rivalry week.", "2026-11-20"),
 ("tailgate-grill", "Tailgate Grill Rush", "Burgers, hot dogs and corn on the grill in a stadium parking lot. Feed the whole tailgate before kickoff without burning anything.", "2027-01-31"),
 ("playoff-bracket", "Playoff Bracket Builder", "Seed twelve college teams into the playoff bracket and watch it bust. Byes, upsets and a title game in the desert.", "2026-12-12"),
 ("christmas-dunk-contest", "Christmas Day Dunk Contest", "Basketball takes over Christmas Day. Throw down holiday dunks in a Santa jersey and win the crowd's score.", "2026-12-15"),
 ("halftime-stage", "Halftime Stage Builder", "Roll the stage onto the field and set up the lights before the halftime clock runs out. The show starts whether you're ready or not.", "2027-01-31"),
 ("snack-table-defense", "Big Game Snack Defense", "Guard the wings, chips and seven-layer dip from the dog and the cousins until the final whistle.", "2027-01-31"),
 ("valentines-big-game", "Big Game on Valentine's Day", "The biggest football game of the year lands on Feb 14. Merge hearts and footballs to throw the ultimate watch party.", "2027-01-31"),
]))
C.append(("Sports", None, [
 ("field-goal-kicker", "Field Goal Kicker", "Flick to kick from 20, then 40, then 60 yards. The wind shifts every kick and the crowd boos every miss."),
 ("quarterback-dime", "Quarterback Dime", "Drop back and hit a receiver in stride before the linebacker closes in. Lead the throw perfectly for the touchdown."),
 ("home-run-showdown", "Home Run Showdown", "Time your swing to send baseballs into the bleachers. Hit the scoreboard for a bonus, hit the parking lot for glory."),
 ("tee-ball", "Tee-Ball Chaos", "Kids' tee-ball: hit off the tee, run the bases the right way, and ignore the outfielders picking dandelions. Dad is filming."),
 ("slap-shot", "Slap Shot Showdown", "Five shots, five holes. Pick your corner and beat the hockey goalie before the horn."),
 ("buzzer-beater", "Buzzer Beater", "0.8 seconds left, down by two. Catch, turn and shoot the three for the win while the gym holds its breath."),
 ("hot-dog-contest", "Hot Dog Eating Contest", "Tap to eat as many hot dogs as you can in ten minutes at the boardwalk contest. Dunk the buns, beat the champ, claim the belt."),
 ("backyard-cornhole", "Backyard Cornhole", "Toss bean bags at the slanted board at a backyard cookout. Sink it for three, knock your rival's bag off for revenge."),
 ("monster-truck", "Monster Truck Freestyle", "Crush a row of junk cars, nail the backflip and win the stadium crowd before the clock runs out."),
 ("oval-stock-car", "Oval Track Stock Car", "Draft, bump and pass on a high-banked oval. Two hundred laps of left turns squeezed into sixty seconds."),
 ("cheer-pyramid", "Cheer Pyramid Stack", "Stack the cheer squad into a pyramid and hold it steady through the routine. One wobble and it's a pile on the mat."),
 ("mascot-race", "Ballpark Mascot Race", "Race as a giant hot dog, ketchup bottle or mustard around the warning track between innings. Trip the leader for the win."),
]))
C.append(("Food & drink", None, [
 ("burrito-bowl-line", "Burrito Bowl Line Tycoon", "Run a fast-casual burrito bowl line. Customers judge every scoop size: \"They said extra rice.\" Speed up, upgrade the line and keep it moving."),
 ("drive-thru-rush", "Drive-Thru Rush", "Six cars, two headsets, one fryer. Take orders at the speaker, bag them right and beat the window timer."),
 ("waffle-diner", "3 A.M. Waffle Diner", "It's 3 a.m. at the 24-hour waffle diner. Cook, plate and slide orders down the counter while the late-night chaos walks in."),
 ("gas-station-haul", "Mega Gas Station Haul", "Fill your arms at a giant highway gas station: jerky wall, brisket sandwiches, fudge, souvenir T-shirts. The road trip leaves in 90 seconds."),
 ("pumpkin-spice-barista", "Pumpkin Spice Barista", "The line is out the door and every order is a different pumpkin spice drink. Pump, steam, misspell the name, hand it off."),
 ("county-fair-fryer", "County Fair Deep-Fry", "Dip anything into the fair fryer: butter, cookies, a candy bar, a pickle. Rate the result and chase the blue ribbon."),
 ("tipping-screen", "Tipping Screen Panic", "The tablet spins around: 18%, 20%, 25% or custom? Pick fast while the barista watches you decide."),
 ("brisket-pit", "Brisket Pit Master", "Keep the smoker at the right temperature for twelve hours squeezed into sixty seconds. Wrap at the stall, slice it for the judges."),
 ("lemonade-stand", "Lemonade Stand Tycoon", "Set the price, add ice and sell lemonade on a hot suburban street. Expand to a bigger stand before the homeowners association shows up."),
 ("cookie-stand", "Scout Cookie Stand", "Sell boxes of cookies at a folding table outside the grocery store. Pitch shoppers, make change and hit the troop goal."),
 ("dollar-slice", "Dollar Slice Fold", "Fold the giant pizza slice and speed-walk the crowded sidewalk to the subway without dripping grease on anyone."),
]))
C.append(("City life", None, [
 ("subway-rush", "Subway Rush Hour", "Pack commuters into the subway car before the doors close. Stand clear of the closing doors, please."),
 ("yellow-cab", "Yellow Cab Crosstown", "Weave a yellow taxi through gridlocked avenues, honk at the bike messengers and drop the fare before the meter maxes out."),
 ("bodega-cat", "Bodega Cat Merge", "Merge sleepy corner-store cats on the chip racks, deli counter and lottery machine to build the ultimate bodega."),
 ("pigeon-street-cart", "Pigeon vs Hot Dog Cart", "You're a city pigeon. Snatch pretzel crumbs and dropped fries from the street-cart line without getting shooed."),
 ("times-square-shuffle", "Times Square Shuffle", "Cross Times Square at rush hour. Dodge costumed characters, flyer guys and tourists who stop dead for photos."),
 ("wedding-chapel", "Neon Wedding Chapel", "Run a 24-hour drive-through wedding chapel on the Las Vegas Strip. Rings, flowers, a sparkly-suited officiant, next couple please."),
 ("freeway-merge", "Freeway Merge at 5 PM", "Merge across six lanes of rush-hour freeway traffic to make your exit. Blinkers are a suggestion."),
 ("stunt-double", "Hollywood Stunt Double", "Do the movie stunts on a studio backlot: car flips, high falls and explosions, until the director yells cut."),
 ("neon-beach-jet-ski", "Neon Beach City Jet Ski", "Race a jet ski past pastel hotels, palm trees and causeway bridges in a neon beach city at sunset. Bright 1980s colors, big waves, tight turns."),
]))
C.append(("Road trips & outdoors", None, [
 ("route-66", "Route 66 Road Trip", "Drive the old highway past neon motels, diners and giant roadside attractions. Manage gas, snacks and the are-we-there-yet meter."),
 ("campsite-bear", "Campsite Bear Escape", "You left food in the tent at a national park. Get the cooler into the bear box before the bear finds it."),
 ("tornado-chaser", "Tornado Chaser", "Drive a pickup across the open plains to get close enough to film the twister, then get out fast."),
 ("geyser-photo", "Geyser Photo Timing", "Wait for the famous geyser to erupt and snap the perfect photo. Don't step off the boardwalk."),
 ("gator-golf", "Swamp Gator Golf", "Play mini golf on a swampy course where the water hazards have alligators in them. Hit it in the water and it's gone."),
 ("ice-fishing", "Ice Fishing Shack", "Drill a hole in the frozen lake, drop a line and reel in fish before your fingers freeze."),
 ("rv-parking", "RV Parking Pro", "Back a huge RV into a tight campground spot while every camper in the park watches."),
]))
C.append(("School & campus", None, [
 ("cafeteria-tray", "Cafeteria Tray Balance", "Carry pizza, chocolate milk and jiggly gelatin through the crowded lunchroom without dropping a thing."),
 ("school-bus-route", "School Bus Route", "Drive the yellow school bus and pick up every kid on time. Swing out the stop-sign arm or the cars blow right past."),
 ("locker-combo", "Locker Combo Rush", "Three numbers, four minutes between classes. Spin the dial right, left, right and grab your books before the bell."),
 ("hall-pass", "Hall Pass Stealth", "Sneak to the vending machine without a hall pass. Hide from the hall monitor around every corner."),
 ("spirit-week", "Spirit Week Outfits", "Pajama Day, Decades Day, Twin Day, Color Wars. Dress for each day and win points for your class."),
 ("homecoming-float", "Homecoming Float Builder", "Build your class's homecoming float with tissue paper and chicken wire before the parade starts."),
 ("dorm-packing", "Dorm Room Packing Puzzle", "Fit the mini fridge, futon and lofted bed into a tiny dorm room on move-in day."),
 ("science-fair", "Science Fair Volcano", "Mix baking soda and vinegar just right for the judges at the school science fair. Too much and the gym floods."),
 ("snow-day", "Snow Day Watch", "It's 5 a.m. and the snow is falling. Watch the school closings scroll across the TV and hope your school makes the list."),
 ("promposal", "Promposal Planner", "Plan the most over-the-top prom invitation: signs, balloons, a flash mob. Will they say yes?"),
]))
C.append(("Suburbs & everyday life", None, [
 ("lawn-stripes", "Perfect Lawn Stripes", "Mow perfect stripes into the front lawn before the homeowners association letter arrives."),
 ("leaf-blower-war", "Leaf Blower War", "Blow the fall leaves into the neighbor's yard faster than they can blow them back."),
 ("garage-sale", "Garage Sale Haggler", "Price your junk, haggle with early-bird shoppers and clear the driveway by noon."),
 ("dmv-line", "DMV Line Simulator", "Now serving number 3. You are number 147. Survive the wait, fill the forms out right and smile for the worst photo ever."),
 ("airport-security", "Airport Security Bins", "Shoes off, laptop out, liquids in the little bag. Load the bins fast and don't hold up the line."),
 ("self-checkout", "Self-Checkout Showdown", "Scan, bag and pay before the machine says unexpected item in the bagging area."),
 ("snow-shovel", "Driveway Shovel Race", "Clear the driveway before the snowplow comes by and buries the end of it again."),
 ("hoa-inspector", "HOA Inspector", "Walk the cul-de-sac with a clipboard and spot every violation: plastic flamingos, tall grass, the wrong mailbox color."),
]))
C.append(("Wild West & history", None, [
 ("wagon-trail", "Wagon Trail West", "Lead a covered wagon west. Pick supplies, ford rivers and keep everyone fed and healthy until you reach the coast."),
 ("pony-express", "Pony Express Relay", "Gallop the mail between relay stations and swap horses without stopping."),
 ("gold-rush", "Gold Rush Panning", "Shake the pan in the creek and keep the gold flakes. Strike it rich before the claim runs dry."),
 ("saloon-slide", "Saloon Drink Slide", "Slide sarsaparillas down the long saloon bar to the right cowboy. Push too hard and the glass shatters."),
 ("rodeo-bull", "Rodeo Bull Ride", "Hang on for eight seconds at the rodeo. Lean against every buck and spin while the clown stands by."),
 ("moon-landing", "Moon Landing 1969", "Pilot the lunar module down to the surface while the fuel gauge drops. Land softly and plant the flag."),
]))
C.append(("Pop culture & trends", None, [
 ("streamer-marathon", "Streamer Challenge Marathon", "Invent your own streamer, then survive one hundred over-the-top challenges in a giant warehouse to win the grand-prize car."),
 ("bracelet-trade", "Friendship Bracelet Trading", "Trade beaded friendship bracelets with fans on the stadium concourse before the concert starts."),
 ("pop-star-setlist", "Pop Star Tour Setlist", "Invent your own pop star and play their stadium tour one era at a time. Tap to the beat and swap costumes on cue."),
 ("price-guess-show", "Guess the Price Game Show", "Guess the prices of everyday groceries under bright studio lights, then spin a giant prize wheel while the audience shouts numbers."),
 ("talent-show", "Talent Show Showstopper", "Step onto a TV talent show stage, nail your act and bring all four judges to their feet for a standing ovation. Confetti if you do."),
]))
topics = []
for cat, cat_ship, items in C:
    for it in items:
        tid, title, desc = it[0], it[1], it[2]
        ship = it[3] if len(it) > 3 else cat_ship
        topics.append({"id": tid, "category": cat, "title": title, "desc": desc, "ship_by": ship})
EVENT_CAT = {"Thanksgiving": ("2026-11-26", "Thanksgiving"), "Holiday shopping": ("2026-11-30", "Cyber Monday"), "Winter holidays": ("2026-12-25", "Christmas")}
EVENT_ID = {
 "returns-line": ("2026-12-27", "Returns week"), "dreidel-latke": ("2026-12-12", "Hanukkah"), "ball-drop": ("2026-12-31", "New Year's Eve"),
 "advent-calendar": ("2026-12-24", "Christmas Eve"), "rivalry-tug": ("2026-11-28", "Rivalry weekend"), "tailgate-grill": ("2027-02-14", "The Big Game"),
 "playoff-bracket": ("2027-01-25", "Title game"), "christmas-dunk-contest": ("2026-12-25", "Christmas Day"), "halftime-stage": ("2027-02-14", "The Big Game"),
 "snack-table-defense": ("2027-02-14", "The Big Game"), "valentines-big-game": ("2027-02-14", "The Big Game"),
}
for t in topics:
    ev = EVENT_ID.get(t["id"]) or EVENT_CAT.get(t["category"])
    t["event"], t["event_name"] = (ev if ev else (None, None))
    if t["ship_by"] and not t["event"]:
        raise SystemExit("dated topic without event: " + t["id"])
assert len(topics) == 100, len(topics)
assert len({t['id'] for t in topics}) == 100
import os
json.dump(topics, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'topics.base.json'), 'w'), indent=1)
from collections import Counter
print(Counter(t['category'] for t in topics))
