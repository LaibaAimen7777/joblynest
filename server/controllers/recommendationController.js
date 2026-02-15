import { supabase } from "../supabaseClient.js";
import { cosineSimilarity } from "../utils/similarity.js";

function makeValueFromTitle(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function seekerToVector(
  seeker,
  categories,
  minPay,
  maxPay,
  { catWeight = 2, payWeight = 1, subcatWeight = 0.5 } = {}
) {
  
  const catValue = seeker.normalized_category ?? seeker.main_category ?? "unknown";

  const categoryVector = categories.map((c) =>
    c === catValue ? 1 * catWeight : 0
  );

  
  const subcatVector = categories.map((c) => {
    if (c === catValue) return 0; 
    
    if (seeker.subcategories && Array.isArray(seeker.subcategories)) {
      return 0;
    }
    return 0;
  });

  let normalizedPay = 0;
  if (typeof seeker.pay_rate === "number") {
    const denom = maxPay === minPay ? 1 : maxPay - minPay;
    normalizedPay = (seeker.pay_rate - minPay) / denom;
    if (!isFinite(normalizedPay)) normalizedPay = 0;
  } else {
    normalizedPay = 0;
  }
  normalizedPay = normalizedPay * payWeight;

  return [...categoryVector, ...subcatVector, normalizedPay];
}

export async function getRecommendations(req, res) {
  try {
    const seekerId = req.params.seekerId; 

    const { data: target, error: tErr } = await supabase
      .from("seeker")
      .select("seeker_id, main_category, service_id, pay_rate, selected_subcategory_ids, custom_subcategories, subcategories")
      .eq("seeker_id", seekerId)
      .single();

    if (tErr || !target) {
      return res.status(400).json({ error: "Seeker not found" });
    }

    const { data: servicesData, error: servicesErr } = await supabase
      .from("services")
      .select("id, title");
    
    const serviceIdToCategorySlug = {};
    if (!servicesErr && servicesData) {
      servicesData.forEach(service => {
        const slug = makeValueFromTitle(service.title);
        serviceIdToCategorySlug[service.id] = slug;
      });
    }

    let targetCategory = null;
    if (target.service_id && serviceIdToCategorySlug[target.service_id]) {
      targetCategory = serviceIdToCategorySlug[target.service_id];
    } else if (target.main_category) {
      targetCategory = makeValueFromTitle(target.main_category);
    }

    let targetSubcategories = [];
    if (target.selected_subcategory_ids && Array.isArray(target.selected_subcategory_ids)) {
      const { data: subcatData } = await supabase
        .from("service_subcategory_fk")
        .select("name")
        .in("id", target.selected_subcategory_ids);
      if (subcatData) {
        targetSubcategories = subcatData.map(s => s.name);
      }
    }
    if (target.custom_subcategories && Array.isArray(target.custom_subcategories)) {
      targetSubcategories.push(...target.custom_subcategories);
    }

    const { data: allSeekers, error: aErr } = await supabase
      .from("seeker")
      .select(
        `
    seeker_id,
    main_category,
    service_id,
    pay_rate,
    profile_picture,
    selected_subcategory_ids,
    custom_subcategories,
    subcategories,
    profiles!inner(
      first_name,
      last_name,
      is_active
    )
  `
      )
      .eq("profiles.is_active", true); 

    if (aErr) {
      return res.status(400).json({ error: aErr.message });
    }

    const allSubcatIds = [];
    allSeekers.forEach(s => {
      if (s.selected_subcategory_ids && Array.isArray(s.selected_subcategory_ids)) {
        allSubcatIds.push(...s.selected_subcategory_ids);
      }
    });
    
    const subcatMap = {};
    if (allSubcatIds.length > 0) {
      const uniqueIds = [...new Set(allSubcatIds)];
      const { data: subcatData } = await supabase
        .from("service_subcategory_fk")
        .select("id, name")
        .in("id", uniqueIds);
      
      if (subcatData) {
        subcatData.forEach(subcat => {
          subcatMap[subcat.id] = subcat.name;
        });
      }
    }


    allSeekers.forEach(s => {
      if (s.service_id && serviceIdToCategorySlug[s.service_id]) {
        s.normalized_category = serviceIdToCategorySlug[s.service_id];
      } else if (s.main_category) {
        s.normalized_category = makeValueFromTitle(s.main_category);
      } else {
        s.normalized_category = "unknown";
      }

      const subcats = [];
      if (s.selected_subcategory_ids && Array.isArray(s.selected_subcategory_ids)) {
        s.selected_subcategory_ids.forEach(id => {
          if (subcatMap[id]) subcats.push(subcatMap[id]);
        });
      }
      if (s.custom_subcategories && Array.isArray(s.custom_subcategories)) {
        subcats.push(...s.custom_subcategories);
      }
      if (subcats.length === 0 && s.subcategories && Array.isArray(s.subcategories)) {
        subcats.push(...s.subcategories);
      }
      s.subcategories = subcats;
    });

  
    target.normalized_category = targetCategory || "unknown";
    target.subcategories = targetSubcategories;


    const categories = [
      ...new Set(allSeekers.map((s) => s.normalized_category ?? "unknown")),
    ];

    const payValues = allSeekers
      .map((s) => s.pay_rate)
      .filter((p) => typeof p === "number" && !isNaN(p));

    const minPay = payValues.length ? Math.min(...payValues) : 0;
    const maxPay = payValues.length ? Math.max(...payValues) : minPay || 1;

    const weights = { catWeight: 2, payWeight: 1 };

    const targetVector = seekerToVector(
      target,
      categories,
      minPay,
      maxPay,
      weights
    );

    const scored = allSeekers
      .filter((s) => s.seeker_id !== target.seeker_id)
      .map((s) => {
        const vec = seekerToVector(s, categories, minPay, maxPay, weights);
        const score = cosineSimilarity(targetVector, vec) || 0;
        return {
          normalized_category: s.normalized_category,
          main_category: s.main_category,
          seeker_id: s.seeker_id,
          pay_rate: s.pay_rate,
          profile_picture: s.profile_picture,
          subcategories: s.subcategories || [],
          first_name: s.profiles?.first_name || "",
          last_name: s.profiles?.last_name || "",
          score,
        };
      });

    const strictFiltered = scored.filter((s) => {
      const categoryMatch = s.normalized_category === target.normalized_category;
      if (!categoryMatch) return false;
      
      if (typeof s.pay_rate !== "number" || typeof target.pay_rate !== "number")
        return true;
      
      const lower = target.pay_rate * 0.7;
      const upper = target.pay_rate * 1.3;
      return s.pay_rate >= lower && s.pay_rate <= upper;
    });

    const categoryFiltered = scored.filter((s) => {
      return s.normalized_category === target.normalized_category;
    });

    const subcategoryFiltered = scored.filter((s) => {
      if (target.subcategories.length === 0) return false;
      if (s.subcategories.length === 0) return false;
      
      const targetSubs = new Set(target.subcategories.map(s => s.toLowerCase()));
      const commonSubs = s.subcategories.filter(sub => 
        targetSubs.has(sub.toLowerCase())
      );
      
      return commonSubs.length > 0;
    });

    const highScoreFiltered = scored.filter((s) => s.score > 0.5);

  
    let filtered = [];
    if (strictFiltered.length >= 3) {
      filtered = strictFiltered;
    } else if (categoryFiltered.length >= 3) {
      filtered = categoryFiltered;
    } else if (subcategoryFiltered.length > 0) {
      
      const categorySet = new Set(categoryFiltered.map(s => s.seeker_id));
      filtered = [
        ...categoryFiltered.slice(0, 3),
        ...subcategoryFiltered.filter(s => !categorySet.has(s.seeker_id))
      ];
    } else {

      filtered = highScoreFiltered;
    }

    const seen = new Set();
    filtered = filtered.filter(s => {
      if (seen.has(s.seeker_id)) return false;
      seen.add(s.seeker_id);
      return true;
    });

    filtered.sort((a, b) => {
      const aBonus = a.normalized_category === target.normalized_category ? 0.1 : 0;
      const bBonus = b.normalized_category === target.normalized_category ? 0.1 : 0;
      return (b.score + bBonus) - (a.score + aBonus);
    });

    const result = filtered.slice(0, 5).map((s) => ({
      seeker_id: s.seeker_id,
      main_category: s.normalized_category || s.main_category, 
      payrate: s.pay_rate,
      score: s.score,
      match_percentage: +(s.score * 100).toFixed(1),
      profile_picture: s.profile_picture || "",
      first_name: s.first_name,
      last_name: s.last_name,
    }));

    return res.json({ recommendations: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
