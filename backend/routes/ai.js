const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const InventoryItem = require("../models/InventoryItem");
const Cadet = require("../models/Cadet");

/*
  Enhanced rule-based Assistant (no external LLM yet)
  POST /api/ai/chat { message: string }
  Response: { reply: string, actions?: Action[] }
  Actions:
    - { type: "ADD_TO_CART", itemId, name }
    - { type: "REORDER_LAST", orderId }
    - { type: "SHOW_ITEMS", items: [{name, price}] }

  Supported intents (case-insensitive):
    1. Allowance / balance ("allowance", "balance", "credit left")
    2. Last order summary ("last order", "recent purchase")
    3. Recommendations ("recommend", "suggest", "what should I get")
    4. Price filter ("under 300", "below 250")
    5. Category listing (mentions category word e.g. beer, chocolate)
    6. How many items under X ("how many <item> can I buy with 500", "how many items under 1200")
    7. Price lookup ("price of <item>", "how much is <item>")
    8. Price change ("has price of <item> changed", "did <item> increase")
    9. Remaining budget scenarios ("what can I get with 400", "spend 600")
   10. Fallback help
*/

// Category keywords (extendable) - canonical forms
const CATEGORY_KEYWORDS = [
  "beer",
  "chocolate",
  "bites",
  "liquor",
  "soft",
  "yoghurt",
  "sun",
  "crush",
  "arrack",
];

// Alias map: canonical category -> array of terms (singular/plural/synonyms)
const CATEGORY_ALIASES = {
  beer: ["beer", "beers"],
  chocolate: ["chocolate", "chocolates", "choco"],
  bites: ["bite", "bites", "snack", "snacks"],
  liquor: ["liquor", "liquors", "hard", "arrack", "whisky", "vodka", "rum"],
  soft: ["soft", "softdrink", "soft drink", "soft drinks", "soda"],
  yoghurt: ["yoghurt", "yogurt", "yoghurt drink", "yoghurt drinks"],
  sun: ["sun", "suncrush", "sun crush", "crush"],
  arrack: ["arrack"],
};

function detectCategory(message) {
  for (const [canonical, variants] of Object.entries(CATEGORY_ALIASES)) {
    if (variants.some((v) => message.includes(v))) return canonical;
  }
  return null;
}

// Return inventory items that match a canonical category by either category field OR name tokens
function getCategoryItems(inventory, canonical) {
  const variants = CATEGORY_ALIASES[canonical] || [canonical];
  return inventory.filter((i) => {
    const cat = (i.category || "").toLowerCase();
    const name = (i.name || "").toLowerCase();
    return variants.some((v) => cat.includes(v) || name.includes(v));
  });
}

function extractNumber(str) {
  const m = String(str || "").match(/(\d+[\d,]*)(?:\.?\d*)/);
  if (!m) return null;
  return Number(m[1].replace(/,/g, ""));
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Clean assistant reply text to remove unwanted prompt phrases
function cleanReply(s) {
  if (!s && s !== "") return s;
  let out = String(s);
  // Remove common phrasing that asks the user "Want one of those added?" or variants
  out = out.replace(/\bwant one(?: of those)?(?: added)?\?\s*/gi, "");
  // Remove leftover repeated whitespace and trim
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

function sendReply(res, payload) {
  if (payload && typeof payload.reply === "string") {
    payload.reply = cleanReply(payload.reply);
  }
  return res.json(payload);
}

function findItemByNameFragment(items, fragment) {
  const f = normalize(fragment);
  if (!f) return null;
  // Prefer startsWith then includes
  let best = null;
  for (const it of items) {
    const n = normalize(it.name);
    if (n.startsWith(f)) return it;
    if (!best && n.includes(f)) best = it;
  }
  return best;
}

// Format a list of items (already sorted by price ascending) with a cap and overflow note
function formatAffordable(items, budget, cap = 12) {
  const total = items.length;
  const shown = items.slice(0, cap);
  const list = shown.map((i) => `${i.name} (Rs.${i.price})`).join(", ");
  if (total > cap) {
    const remaining = total - cap;
    return `${list}, +${remaining} more item${
      remaining === 1 ? "" : "s"
    } at or below Rs.${budget}`;
  }
  return list;
}

router.post("/chat", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Cadet _id
    const rawMsg = String(req.body.message || "").trim();
    if (!rawMsg)
      return res.status(400).json({ reply: "Please type something." });
    const msg = normalize(rawMsg);

    // Parallel light queries
    const [cadet, lastOrder] = await Promise.all([
      Cadet.findById(userId).lean(),
      Order.findOne({ cadet: userId }).sort({ createdAt: -1 }).lean(),
    ]);
    const inventory = await InventoryItem.find({}).lean();
    const inventorySortedByPrice = [...inventory].sort(
      (a, b) => a.price - b.price
    );

    const contains = (...words) => words.every((w) => msg.includes(w));

    // 0. Greeting intent (allow extra trailing words but no conflicting intent keywords)
    if (
      /^(hi|hii|hello|hey|hiya|ayubowan|good\s+morning|good\s+evening|good\s+afternoon)\b/.test(
        msg
      )
    ) {
      // If message also includes stronger intent cues like 'price', 'how many', 'allowance', skip pure greeting response
      if (
        !/(allowance|balance|credit|how many|price|order|recommend|suggest|under|below|cost)/.test(
          msg
        )
      ) {
        return res.json({
          reply:
            "Hello! How can I help you today? Ask about your allowance, last order, how many items fit your budget, item prices, or say e.g. 'how many chocolates under 800'.",
        });
      }
    }

    // 1. Allowance / balance
    if (/(allowance|balance|credit)/.test(msg)) {
      if (!cadet)
        return res.json({ reply: "I couldn't load your profile right now." });
      const remaining = cadet.monthlyAllowance ?? 0;
      const spent = cadet.totalSpent ?? 0;
      const baseLimit = remaining + spent;
      const usedPct = baseLimit > 0 ? Math.round((spent / baseLimit) * 100) : 0;
      return res.json({
        reply: `You have Rs.${remaining} remaining. You've used ${usedPct}% of your monthly allowance (base limit Rs.${baseLimit}).`,
      });
    }

    // 2. Last order
    if (
      contains("last") &&
      (contains("order") || contains("purchase") || contains("receipt"))
    ) {
      if (!lastOrder)
        return res.json({ reply: "You haven't placed any orders yet." });
      const itemList = (lastOrder.items || [])
        .map((i) => `${i.name} x${i.qty}`)
        .join(", ");
      return res.json({
        reply: `Your last order (${lastOrder.orderId}) was: ${itemList}. Total Rs.${lastOrder.total}.`,
      });
    }

    // Helper: extract budget phrases (under 500, with 500, for 1200 etc.)
    const budgetMatch = msg.match(
      /(?:under|below|with|for|upto|up to) (rs\.?\s*)?(\d{2,5})/
    );
    const budget = budgetMatch ? Number(budgetMatch[2]) : null;

    // 3. How many items under X (explicit 'how many')
    if (/how many/.test(msg) && budget) {
      // Try specific item mention after 'how many'
      const afterHowMany = msg.split("how many")[1];
      // Extract text before budget phrase keywords, then remove filler verbs/phrases
      let itemFragment = (afterHowMany || "")
        .split(/with|under|below|for|upto|up to/)[0]
        .replace(
          /can i buy|could i buy|can i get|could i get|do i get|may i buy|might i buy|should i buy|i can buy|i can get|i buy|i get/g,
          ""
        )
        .replace(/please|pls|tell me|roughly|approximately|about/g, "")
        .replace(/\b(of|the|a|an)\b/g, " ")
        .replace(/items?|bottles?|packs?|bars?/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Category quantity query: detect via aliases anywhere in message OR itemFragment
      let categoryWord = detectCategory(msg) || detectCategory(itemFragment);
      if (categoryWord) {
        const catItems = getCategoryItems(inventory, categoryWord).sort(
          (a, b) => a.price - b.price
        );
        if (!catItems.length) {
          return res.json({
            reply: `I couldn't find any ${categoryWord} items right now.`,
          });
        }
        const cheapest = catItems[0];
        if (!cheapest || !cheapest.price) {
          return res.json({
            reply: `I couldn't determine prices for ${categoryWord} items.`,
          });
        }
        const maxQty = Math.floor(budget / cheapest.price);
        if (maxQty <= 0) {
          return res.json({
            reply: `You cannot buy any ${categoryWord} item with Rs.${budget}. Cheapest costs Rs.${cheapest.price}.`,
          });
        }
        const top = catItems.slice(0, 3);
        const variants = top.map((c) => `${c.name} (Rs.${c.price})`).join(", ");
        return res.json({
          reply: `Cheapest ${categoryWord} item is ${cheapest.name} at Rs.${cheapest.price}. With Rs.${budget} you can buy up to ${maxQty}. Some options: ${variants}.`,
        });
      }
      if (itemFragment && itemFragment.length > 1) {
        const it = findItemByNameFragment(inventory, itemFragment);
        if (it) {
          const qty = it.price > 0 ? Math.floor(budget / it.price) : 0;
          if (qty <= 0) {
            return res.json({
              reply: `One ${it.name} costs Rs.${it.price}, so Rs.${budget} isn't enough for one.`,
            });
          }
          return res.json({
            reply: `You can buy ${qty} x ${it.name} with Rs.${budget} (each Rs.${it.price}).`,
          });
        }
      }
      // Otherwise compute cheapest combination of distinct items (top 5 cheapest)
      const cheapest = inventorySortedByPrice
        .slice(0, 5)
        .filter((c) => c.price > 0);
      const affordable = cheapest.filter((c) => c.price <= budget);
      if (!affordable.length) {
        return res.json({
          reply: `You cannot buy anything with Rs.${budget}.`,
        });
      }
      const lines = affordable.map((c) => {
        const qty = Math.floor(budget / c.price);
        return `${c.name} (up to ${qty})`;
      });
      return res.json({
        reply: `With Rs.${budget} you could buy: ${lines.join(", ")}.`,
      });
    }

    // 3b. 'How many' + category WITHOUT budget -> prompt for amount
    if (/how many/.test(msg) && !budget) {
      const afterHowMany = msg.split("how many")[1] || "";
      const categoryWord = detectCategory(msg) || detectCategory(afterHowMany);
      if (categoryWord) {
        const catItems = getCategoryItems(inventory, categoryWord).sort(
          (a, b) => a.price - b.price
        );
        if (catItems.length) {
          const cheapest = catItems[0];
          return res.json({
            reply: `Tell me your budget (e.g. 'under 800' or 'with 1200') and I'll calculate how many ${categoryWord} items you can buy. Cheapest starts at Rs.${cheapest.price}.`,
          });
        } else {
          return res.json({
            reply: `I couldn't find any ${categoryWord} items right now.`,
          });
        }
      }
    }

    // 4. Recommendations (simple: pick cheapest representative per category)
    if (
      /(recommend|suggest)/.test(msg) ||
      (contains("what", "get") && !budget)
    ) {
      const byCat = new Map();
      for (const it of inventory) {
        const cat = (it.category || "Other").toLowerCase();
        if (!byCat.has(cat)) byCat.set(cat, []);
        byCat.get(cat).push(it);
      }
      const picks = [];
      for (const arr of byCat.values()) {
        arr.sort((a, b) => a.price - b.price);
        if (arr[0]) picks.push(arr[0]);
      }
      const top = picks.sort((a, b) => a.price - b.price).slice(0, 3);
      if (!top.length)
        return res.json({ reply: "Inventory seems empty right now." });
      const list = top.map((p) => `${p.name} (Rs.${p.price})`).join(", ");
      return res.json({
        reply: `You could try: ${list}.`,
      });
    }

    // 5. Price filter (under/below X)
    if (budget && /(under|below)/.test(msg)) {
      const filteredAll = inventorySortedByPrice.filter(
        (i) => i.price <= budget
      );
      if (!filteredAll.length)
        return res.json({ reply: `Nothing priced at or below Rs.${budget}.` });
      const replyList = formatAffordable(filteredAll, budget, 12);
      return res.json({
        reply: `Items up to Rs.${budget}: ${replyList}`,
      });
    }

    // 6. Category listing
    {
      const catDetected = detectCategory(msg);
      if (catDetected) {
        const subset = getCategoryItems(inventory, catDetected)
          .sort((a, b) => a.price - b.price)
          .slice(0, 6);
        if (subset.length) {
          return res.json({
            reply: `Here are some ${catDetected} options: ${subset
              .map((s) => `${s.name} (Rs.${s.price})`)
              .join(", ")}`,
          });
        }
      }
    }

    // 7. Price lookup / price change
    if (/price of|how much is|cost of/.test(msg)) {
      // Extract potential item name after cue words
      const pattern = /(price of|how much is|cost of) (.+)/;
      const m = msg.match(pattern);
      const frag = m ? m[2].replace(/\?$/, "").trim() : "";
      if (frag) {
        const it = findItemByNameFragment(inventory, frag);
        if (it) {
          // Price change relative to last order containing it (if exists)
          let changeStr = "";
          if (lastOrder && lastOrder.items) {
            const lastIt = lastOrder.items.find(
              (i) => normalize(i.name) === normalize(it.name)
            );
            if (lastIt && typeof lastIt.price === "number") {
              const diff = it.price - lastIt.price;
              if (diff > 0)
                changeStr = ` (up Rs.${diff} since your last order)`;
              else if (diff < 0)
                changeStr = ` (down Rs.${Math.abs(
                  diff
                )} since your last order)`;
              else changeStr = " (same as in your last order)";
            }
          }
          return res.json({
            reply: `${it.name} costs Rs.${it.price}${changeStr}.`,
          });
        }
      }
    }
    if (/has price|price changed|price increase|did .* price/.test(msg)) {
      // naive: search for any inventory item name word present
      let matched = null;
      for (const it of inventory) {
        const nameParts = normalize(it.name).split(" ").filter(Boolean);
        if (nameParts.some((p) => msg.includes(p))) {
          matched = it;
          break;
        }
      }
      if (matched) {
        let changeStr = "I can't find a previous purchase for comparison.";
        if (lastOrder && lastOrder.items) {
          const lastIt = lastOrder.items.find(
            (i) => normalize(i.name) === normalize(matched.name)
          );
          if (lastIt && typeof lastIt.price === "number") {
            const diff = matched.price - lastIt.price;
            if (diff > 0) changeStr = `Yes, it increased by Rs.${diff}.`;
            else if (diff < 0)
              changeStr = `It actually decreased by Rs.${Math.abs(diff)}.`;
            else changeStr = "No change since your last order.";
          }
        }
        return res.json({
          reply: `${matched.name} is Rs.${matched.price}. ${changeStr}`,
        });
      }
    }

    // 8. Remaining budget scenarios (what can I get with 400)
    if (budget && /(what can i get|what should i get|spend)/.test(msg)) {
      const filtered = inventorySortedByPrice
        .filter((i) => i.price <= budget)
        .slice(0, 8);
      if (!filtered.length)
        return res.json({ reply: `Nothing priced within Rs.${budget}.` });
      return res.json({
        reply: `Within Rs.${budget} you can consider: ${filtered
          .map((f) => `${f.name} (Rs.${f.price})`)
          .join(", ")}`,
      });
    }

    // 9. Generic price filter phrased as "for 500" without 'under'
    if (budget && /for \d/.test(msg)) {
      const filteredAll = inventorySortedByPrice.filter(
        (i) => i.price <= budget
      );
      if (filteredAll.length) {
        const replyList = formatAffordable(filteredAll, budget, 12);
        return res.json({
          reply: `Options for Rs.${budget} or less: ${replyList}`,
        });
      }
    }

    // Fallback help
    return res.json({
      reply:
        "I can help with: allowance, last order, recommendations, price filters, how many items under a budget, item prices & changes, category listings. Examples: 'How many soft drinks under 400', 'How many liquors below 1500', 'How many bites with 600', 'Price of hazelnut milk chocolate', 'Recommend something', 'What can I get with 500'.",
    });
  } catch (err) {
    console.error("[ai.js] /chat error", err);
    res.status(500).json({ reply: "Something went wrong processing that." });
  }
});

module.exports = router;
