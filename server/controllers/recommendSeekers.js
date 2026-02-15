import { supabase } from "../supabaseClient.js";
import { embedText } from "../utils/embedder.js";


function cosineNormalized(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; 
}


function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getLabel(score) {
  if (score >= 0.7) return "Excellent match";
  if (score >= 0.5) return "Very good match";
  if (score >= 0.4) return "Good match";
  if (score >= 0.25) return "Possible match";
  return "Low match";
}


function getWeekday(date) {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[date.getDay()];
}

function expandWeeklyPattern(weeklyPattern, days = 30) {
  const today = new Date();
  const expanded = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const weekday = getWeekday(d);
    expanded[dateStr] = weeklyPattern[weekday] || [];
  }
  return expanded;
}

export async function recommendSeekers(req, res) {
  try {
    const { task_id } = req.query;
    if (!task_id) return res.status(400).json({ error: "task_id required" });

    const { data: task, error: taskErr } = await supabase
      .from("task")
      .select(
        "latitude, longitude, description, descr_embedding, payment_type, category_id"
      )
      .eq("task_id", task_id)
      .single();
    if (taskErr) throw taskErr;

    if (!task.category_id) {
      return res.status(400).json({
        error:
          "Task must have a category assigned. Please select a category when creating the task.",
      });
    }

    let taskEmb = task.descr_embedding;
    if (typeof taskEmb === "string") {
      try {
        taskEmb = JSON.parse(taskEmb);
      } catch {
        taskEmb = null;
      }
    }
    if (!taskEmb) taskEmb = await embedText(task.description || "");

    const taskNorm = Math.sqrt(taskEmb.reduce((sum, x) => sum + x * x, 0));
    if (taskNorm > 0) {
      taskEmb = taskEmb.map((x) => x / taskNorm);
    }

    const { data: servicesData, error: servicesErr } = await supabase
      .from("services")
      .select("id, title")
      .ilike("title", "Other")
      .limit(1);

    const otherCategoryId =
      servicesData && servicesData.length > 0 ? servicesData[0].id : null;
    const isOtherCategory =
      otherCategoryId && task.category_id === otherCategoryId;

    let seekers = [];
    let otherCategorySeekers = []; 

    if (isOtherCategory) {
      const { data: otherSeekers, error: otherSeekerErr } = await supabase
        .from("seeker")
        .select(
          `
          seeker_id,
          description,
          geo_location,
          latitude,
          longitude,
          subcategories,
          selected_subcategory_ids,
          custom_subcategories,
          pay_rate,
          main_category,
          service_id,
          descr_embedding,
          availability,
          payment_type,
          profiles!inner(is_active)
        `
        )
        .eq("profiles.is_active", true)
        .eq("service_id", otherCategoryId);
      if (otherSeekerErr) throw otherSeekerErr;
      otherCategorySeekers = otherSeekers || [];

      const { data: allOtherSeekers, error: allOtherSeekerErr } = await supabase
        .from("seeker")
        .select(
          `
          seeker_id,
          description,
          geo_location,
          latitude,
          longitude,
          subcategories,
          selected_subcategory_ids,
          custom_subcategories,
          pay_rate,
          main_category,
          service_id,
          descr_embedding,
          availability,
          payment_type,
          profiles!inner(is_active)
        `
        )
        .eq("profiles.is_active", true)
        .neq("service_id", otherCategoryId); 
      if (allOtherSeekerErr) throw allOtherSeekerErr;

      seekers = [...otherCategorySeekers, ...(allOtherSeekers || [])];
    } else {

      const { data: categorySeekers, error: seekerErr } = await supabase
        .from("seeker")
        .select(
          `
          seeker_id,
          description,
          geo_location,
          latitude,
          longitude,
          subcategories,
          selected_subcategory_ids,
          custom_subcategories,
          pay_rate,
          main_category,
          service_id,
          descr_embedding,
          availability,
          payment_type,
          profiles!inner(is_active)
        `
        )
        .eq("profiles.is_active", true)
        .eq("service_id", task.category_id);
      if (seekerErr) throw seekerErr;

      const { data: otherCategorySeekersData, error: otherCategorySeekersErr } =
        await supabase
          .from("seeker")
          .select(
            `
          seeker_id,
          description,
          geo_location,
          latitude,
          longitude,
          subcategories,
          selected_subcategory_ids,
          custom_subcategories,
          pay_rate,
          main_category,
          service_id,
          descr_embedding,
          availability,
          payment_type,
          profiles!inner(is_active)
        `
          )
          .eq("profiles.is_active", true)
          .eq("service_id", otherCategoryId);
      if (otherCategorySeekersErr) throw otherCategorySeekersErr;
      otherCategorySeekers = otherCategorySeekersData || [];

      seekers = [...(categorySeekers || []), ...otherCategorySeekers];
    }

    if (!seekers || seekers.length === 0) {
      return res.json({
        task_id,
        inferredCategory: null,
        results: [],
        message: "No seekers found",
      });
    }

    const taskDescriptionLower = (task.description || "").toLowerCase();

    // For "other" category tasks: analyze description to find matching categories/subcategories
    let categoryMatchMap = {}; // Maps category names (lowercase) to their IDs
    let allSubcategoryNames = []; // All subcategory names for keyword matching
    let categoryServiceIdMap = {}; // Maps service_id to category name

    if (isOtherCategory) {

      const { data: allCategories, error: categoriesErr } = await supabase
        .from("services")
        .select("id, title")
        .neq("id", otherCategoryId);

      if (!categoriesErr && allCategories) {
        allCategories.forEach((cat) => {
          const catNameLower = cat.title.toLowerCase();
          categoryMatchMap[catNameLower] = cat.id;
          categoryServiceIdMap[cat.id] = cat.title.toLowerCase();

          cat.title
            .toLowerCase()
            .split(/\s+/)
            .forEach((word) => {
              if (word.length > 3) {
                categoryMatchMap[word] = cat.id;
              }
            });
        });
      }

      const { data: allSubcats, error: allSubcatsErr } = await supabase
        .from("service_subcategory_fk")
        .select("id, name, service_id");

      if (!allSubcatsErr && allSubcats) {
        allSubcategoryNames = allSubcats.map((subcat) => ({
          id: subcat.id,
          name: subcat.name.toLowerCase(),
          service_id: subcat.service_id,
        }));
      }
    }

    const allSubcatIds = [];
    (seekers || []).forEach((s) => {
      if (
        s.selected_subcategory_ids &&
        Array.isArray(s.selected_subcategory_ids)
      ) {
        allSubcatIds.push(...s.selected_subcategory_ids);
      }
    });

    const subcatMap = {};
    if (allSubcatIds.length > 0) {
      const uniqueIds = [...new Set(allSubcatIds)];
      const { data: subcatData, error: subcatErr } = await supabase
        .from("service_subcategory_fk")
        .select("id, name")
        .in("id", uniqueIds);

      if (!subcatErr && subcatData) {
        subcatData.forEach((subcat) => {
          subcatMap[subcat.id] = subcat.name.toLowerCase();
        });
      }
    }

    const validSeekers = (seekers || [])
      .map((s) => {
        const isFromOtherCategory = s.service_id === otherCategoryId;
        s.isFromOtherCategory = isFromOtherCategory;
        return s;
      })
      .filter((s) => {
        if (task.payment_type && s.payment_type !== task.payment_type) {
          return false;
        }
        if (!s.descr_embedding) return false;
        if (typeof s.descr_embedding === "string") {
          try {
            s.descr_embedding = JSON.parse(s.descr_embedding);
          } catch {
            return false;
          }
        }
        const norm = Math.sqrt(
          s.descr_embedding.reduce((sum, x) => sum + x * x, 0)
        );
        if (norm === 0) return false;
        s.descr_embedding = s.descr_embedding.map((x) => x / norm);

        const subcats = [];
        if (
          s.selected_subcategory_ids &&
          Array.isArray(s.selected_subcategory_ids)
        ) {
          s.selected_subcategory_ids.forEach((id) => {
            if (subcatMap[id]) subcats.push(subcatMap[id]);
          });
        }
        if (s.custom_subcategories && Array.isArray(s.custom_subcategories)) {
          subcats.push(...s.custom_subcategories.map((sc) => sc.toLowerCase()));
        }
        if (
          subcats.length === 0 &&
          s.subcategories &&
          Array.isArray(s.subcategories)
        ) {
          subcats.push(
            ...s.subcategories.map((sc) => String(sc).toLowerCase())
          );
        }
        s.subcategories = subcats;

        return Array.isArray(s.descr_embedding) && s.descr_embedding.length > 0;
      });


    let taskMatchedCategoryIds = new Set();
    let taskMatchedSubcategoryIds = new Set();
    let taskMatchedKeywords = [];

    if (isOtherCategory && taskDescriptionLower) {
      const words = taskDescriptionLower
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z0-9]/g, ""))
        .filter((w) => w.length > 3);

      Object.keys(categoryMatchMap).forEach((catName) => {
        if (
          taskDescriptionLower.includes(catName) ||
          words.some((w) => catName.includes(w) || w.includes(catName))
        ) {
          taskMatchedCategoryIds.add(categoryMatchMap[catName]);
          taskMatchedKeywords.push(catName);
        }
      });

      allSubcategoryNames.forEach((subcat) => {
        const subcatName = subcat.name;
        if (
          taskDescriptionLower.includes(subcatName) ||
          words.some((w) => subcatName.includes(w) || w.includes(subcatName)) ||
          subcatName
            .split(/\s+/)
            .some(
              (word) => word.length > 3 && taskDescriptionLower.includes(word)
            )
        ) {
          taskMatchedSubcategoryIds.add(subcat.id);
          if (subcat.service_id) {
            taskMatchedCategoryIds.add(subcat.service_id);
          }
          taskMatchedKeywords.push(subcatName);
        }
      });
    }

    const similarities = validSeekers.map((s) => {
      const textSim = cosineNormalized(taskEmb, s.descr_embedding);
      const tLat = Number(task.latitude);
      const tLon = Number(task.longitude);
      const sLat = Number(s.latitude);
      const sLon = Number(s.longitude);
      if (
        !isFinite(tLat) ||
        !isFinite(tLon) ||
        !isFinite(sLat) ||
        !isFinite(sLon)
      ) {
        return null;
      }

      const distance = haversine(tLat, tLon, sLat, sLon);

      let subcatMatchScore = 0;
      if (
        s.subcategories &&
        s.subcategories.length > 0 &&
        taskDescriptionLower
      ) {
        const matchingSubcats = s.subcategories.filter((subcat) => {
          const subcatLower = String(subcat).toLowerCase();
          
          return (
            taskDescriptionLower.includes(subcatLower) ||
            subcatLower
              .split(/\s+/)
              .some(
                (word) => word.length > 3 && taskDescriptionLower.includes(word)
              )
          );
        });

        subcatMatchScore = Math.min(
          matchingSubcats.length / Math.max(s.subcategories.length, 1),
          1
        );
      }

      let customSubcatMatchScore = 0;
      if (
        isOtherCategory &&
        s.isFromOtherCategory &&
        s.custom_subcategories &&
        Array.isArray(s.custom_subcategories) &&
        taskDescriptionLower
      ) {

        const taskWords = taskDescriptionLower
          .split(/\s+/)
          .map((w) => w.replace(/[^a-z0-9]/g, ""))
          .filter((w) => w.length > 2); 

        const matchingCustomSubcats = s.custom_subcategories.filter(
          (customSubcat) => {
            if (!customSubcat) return false;
            const customLower = String(customSubcat).toLowerCase().trim();


            if (
              taskDescriptionLower.includes(customLower) ||
              customLower.includes(taskDescriptionLower)
            ) {
              return true;
            }

            const customWords = customLower
              .split(/\s+/)
              .filter((w) => w.length > 2);
            const hasMatchingWords = customWords.some((customWord) => {
              if (taskDescriptionLower.includes(customWord)) return true;
              return taskWords.some(
                (taskWord) =>
                  customWord.includes(taskWord) || taskWord.includes(customWord)
              );
            });

            const hasTaskWordsInCustom = taskWords.some(
              (taskWord) =>
                taskWord.length > 2 && customLower.includes(taskWord)
            );

            return hasMatchingWords || hasTaskWordsInCustom;
          }
        );

        if (matchingCustomSubcats.length > 0) {
         
          customSubcatMatchScore = Math.min(
            0.5 +
              (0.5 * matchingCustomSubcats.length) /
                Math.max(s.custom_subcategories.length, 1),
            1.0
          );
        }
      }

      let categorySubcatMatchBoost = 0;
      if (isOtherCategory && !s.isFromOtherCategory) {
       
        if (s.service_id && taskMatchedCategoryIds.has(s.service_id)) {
          categorySubcatMatchBoost += 0.4; 
        }

        if (
          s.selected_subcategory_ids &&
          Array.isArray(s.selected_subcategory_ids)
        ) {
          const matchingSubcatIds = s.selected_subcategory_ids.filter((id) =>
            taskMatchedSubcategoryIds.has(id)
          );
          if (matchingSubcatIds.length > 0) {
            categorySubcatMatchBoost +=
              0.3 *
              (matchingSubcatIds.length /
                Math.max(s.selected_subcategory_ids.length, 1));
          }
        }

        if (s.custom_subcategories && Array.isArray(s.custom_subcategories)) {
          const matchingCustomSubcats = s.custom_subcategories.filter(
            (customSubcat) => {
              const customLower = String(customSubcat).toLowerCase();
              return taskMatchedKeywords.some(
                (keyword) =>
                  customLower.includes(keyword) ||
                  keyword.includes(customLower) ||
                  customLower
                    .split(/\s+/)
                    .some((word) => word.length > 3 && keyword.includes(word))
              );
            }
          );
          if (matchingCustomSubcats.length > 0) {
            categorySubcatMatchBoost +=
              0.2 *
              (matchingCustomSubcats.length /
                Math.max(s.custom_subcategories.length, 1));
          }
        }

        if (s.subcategories && Array.isArray(s.subcategories)) {
          const matchingSubcats = s.subcategories.filter((subcat) => {
            const subcatLower = String(subcat).toLowerCase();
            return taskMatchedKeywords.some(
              (keyword) =>
                subcatLower.includes(keyword) ||
                keyword.includes(subcatLower) ||
                subcatLower
                  .split(/\s+/)
                  .some((word) => word.length > 3 && keyword.includes(word))
            );
          });
          if (matchingSubcats.length > 0) {
            categorySubcatMatchBoost +=
              0.2 *
              (matchingSubcats.length / Math.max(s.subcategories.length, 1));
          }
        }

        categorySubcatMatchBoost = Math.min(1.0, categorySubcatMatchBoost);
      }

      return {
        ...s,
        textSim,
        distance,
        subcatMatchScore,
        categorySubcatMatchBoost,
        customSubcatMatchScore,
      };
    });

    const maxDistance = Math.max(...similarities.map((s) => s.distance), 1);
    const minDistance = Math.min(...similarities.map((s) => s.distance), 0);
    const distanceRange = maxDistance - minDistance || 1;

    const results = similarities.map((s) => {
      const isFromOtherCategory = s.isFromOtherCategory || false;

      const distanceScore =
        distanceRange > 0 ? 1 - (s.distance - minDistance) / distanceRange : 1;

      const distancePenalty =
        s.distance > 10
          ? Math.max(0.7, 1 - (s.distance - 10) / 100) 
          : 1.0; 

      let matchScore;

      if (isOtherCategory && isFromOtherCategory) {

        if (s.customSubcatMatchScore > 0) {
          // Very high priority when custom subcategories match: 60% custom match + 30% text similarity + 10% distance
          matchScore =
            (0.6 * s.customSubcatMatchScore + // Custom subcategory match (0-1) - VERY HIGH PRIORITY
              0.3 * Math.max(0, s.textSim) + // Text similarity (0-1)
              0.1 * distanceScore) * // Distance score (0-1)
            distancePenalty;
        } else {
          // No custom subcategory match: prioritize description similarity
          matchScore =
            (0.9 * Math.max(0, s.textSim) + // Text similarity (0-1) - heavily weighted
              0.1 * distanceScore) * // Distance score (0-1)
            distancePenalty;
        }
      } else if (isOtherCategory && !isFromOtherCategory) {
        // For other seekers when task is "other":
        // Balance description similarity (35%) with category/subcategory match boost (35%),
        // subcategory matching (20%), and distance (10%)
        // The categorySubcatMatchBoost helps prioritize seekers with matching categories/subcategories
        const baseScore =
          0.35 * Math.max(0, s.textSim) + // Text similarity (0-1)
          0.2 * s.subcatMatchScore + // Subcategory match (0-1)
          0.1 * distanceScore; // Distance score (0-1)

        // Add category/subcategory match boost (can significantly improve score)
        // This boost rewards seekers whose category/subcategory matches keywords in task description
        matchScore =
          (baseScore + 0.35 * s.categorySubcatMatchBoost) * distancePenalty;
      } else {
        // For regular categories: KEEP EXISTING SCORING LOGIC for category-specific seekers
        // BUT for "other" category seekers: use ONLY text similarity

        // Check if this seeker is from "other" category
        const isFromOtherCategory = s.isFromOtherCategory || false;

        if (isFromOtherCategory) {
          // For "other" category seekers: GIVE ALL WEIGHT TO TEXT SIMILARITY
          // When task has a specific category but seeker is in "other" category,
          // use only description similarity to determine if they should be recommended
          matchScore = Math.max(0, s.textSim);
        } else {
          // For category-specific seekers: standard scoring (existing logic)
          // - Text similarity: 60% (most important - semantic match)
          // - Subcategory match: 25% (specific skills match)
          // - Distance: 15% (but with penalty, not bonus)
          matchScore =
            (0.6 * Math.max(0, s.textSim) + // Text similarity (0-1)
              0.25 * s.subcatMatchScore + // Subcategory match (0-1)
              0.15 * distanceScore) * // Distance score (0-1)
            distancePenalty;
        }
      }

      const expandedAvailability = s.availability
        ? expandWeeklyPattern(s.availability, 30)
        : {};

      return {
        seeker_id: s.seeker_id,
        description: s.description,
        geo_location: s.geo_location,
        subcategories: s.subcategories,
        pay_rate: s.pay_rate,
        main_category: s.main_category,
        similarity: s.textSim,
        distance: s.distance,
        subcatMatchScore: s.subcatMatchScore,
        categorySubcatMatchBoost: isOtherCategory
          ? s.categorySubcatMatchBoost
          : undefined, // Only for "other" category tasks
        customSubcatMatchScore:
          isOtherCategory && isFromOtherCategory
            ? s.customSubcatMatchScore
            : undefined, // Only for "other" category seekers
        matchScore: Math.max(0, Math.min(1, matchScore)), // Clamp between 0 and 1
        label: getLabel(matchScore),
        availability: expandedAvailability,
        isFromOtherCategory: isFromOtherCategory,
      };
    });

    // For "other" category: prioritize "other" category seekers, then show other good matches
    if (isOtherCategory) {
      // Separate "other" category seekers and other seekers
      const otherCategoryResults = results.filter((r) =>
        otherCategorySeekers.some((os) => os.seeker_id === r.seeker_id)
      );
      const otherCategoryResultsIds = new Set(
        otherCategorySeekers.map((os) => os.seeker_id)
      );
      const nonOtherResults = results.filter(
        (r) => !otherCategoryResultsIds.has(r.seeker_id)
      );

      // For "other" category seekers: prioritize by custom subcategory match (if any),
      // then by match score, then by description similarity
      // Seekers with matching custom subcategories get VERY HIGH priority
      otherCategoryResults.sort((a, b) => {
        const customMatchA = a.customSubcatMatchScore || 0;
        const customMatchB = b.customSubcatMatchScore || 0;

        // Primary sort: prioritize seekers with custom subcategory matches
        if (customMatchA > 0 || customMatchB > 0) {
          if (Math.abs(customMatchB - customMatchA) > 0.01) {
            return customMatchB - customMatchA; // Higher custom match score first
          }
        }

        // Secondary sort: by match score (which includes custom match boost)
        if (Math.abs(b.matchScore - a.matchScore) > 0.01) {
          return b.matchScore - a.matchScore;
        }

        // Tertiary sort: by description similarity
        return b.similarity - a.similarity;
      });

      // For other seekers: prioritize by matchScore (includes category/subcategory boost),
      // then by categorySubcatMatchBoost, then by description similarity
      // This ensures seekers with matching categories/subcategories are ranked higher
      nonOtherResults.sort((a, b) => {
        if (Math.abs(b.matchScore - a.matchScore) > 0.01) {
          return b.matchScore - a.matchScore; // Primary sort by match score (includes category/subcat boost)
        }
        // If match scores are similar, prioritize those with higher category/subcategory match boost
        const boostA = a.categorySubcatMatchBoost || 0;
        const boostB = b.categorySubcatMatchBoost || 0;
        if (Math.abs(boostB - boostA) > 0.05) {
          return boostB - boostA; // Secondary sort by category/subcategory match boost
        }
        return b.similarity - a.similarity; // Tertiary sort by description similarity
      });

      // Filter "other" category seekers:
      // - Always include those with custom subcategory matches (VERY HIGH PRIORITY)
      // - Otherwise, require minimum description similarity (0.25) or reasonable match score (0.15)
      const filteredOtherCategory = otherCategoryResults.filter((r) => {
        const hasCustomMatch = (r.customSubcatMatchScore || 0) > 0;
        const hasGoodSimilarity = r.similarity >= 0.25;
        const hasReasonableScore = r.matchScore >= 0.15;

        // Always include if custom subcategories match (very high priority)
        if (hasCustomMatch) return true;

        // Otherwise, require good similarity or reasonable score
        return hasGoodSimilarity || hasReasonableScore;
      });

      // Filter other seekers: require good description match (0.20) AND/OR subcategory match OR category/subcategory match
      // This ensures we show seekers with either good description similarity, relevant subcategories,
      // or matching categories/subcategories extracted from task description
      const filteredNonOther = nonOtherResults.filter((r) => {
        const hasGoodDescription = r.similarity >= 0.2;
        const hasGoodSubcatMatch = r.subcatMatchScore >= 0.3;
        const hasCategoryMatch =
          r.categorySubcatMatchBoost && r.categorySubcatMatchBoost >= 0.3;
        const hasReasonableMatchScore = r.matchScore >= 0.15;

        // Include if: (good description OR good subcategory match OR category match) AND reasonable overall score
        return (
          (hasGoodDescription || hasGoodSubcatMatch || hasCategoryMatch) &&
          hasReasonableMatchScore
        );
      });

      // Combine: "other" category first (prioritized by description), then others (prioritized by description + subcategories)
      const filteredResults = [...filteredOtherCategory, ...filteredNonOther];

      res.json({
        task_id,
        inferredCategory: null,
        results: filteredResults,
        totalMatches: filteredResults.length,
        otherCategoryMatches: filteredOtherCategory.length,
        otherMatches: filteredNonOther.length,
      });
    } else {
      // For regular categories: sort by match score (highest first)
      results.sort((a, b) => b.matchScore - a.matchScore);

      // Filter out very low quality matches
      const filteredResults = results.filter((r) => r.matchScore >= 0.0);

      res.json({
        task_id,
        inferredCategory: null, // No longer inferring, using task category
        results: filteredResults,
        totalMatches: filteredResults.length,
      });
    }
  } catch (err) {
    console.error("recommendSeekers error:", err);
    res.status(500).json({ error: err.message });
  }
}
