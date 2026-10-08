// Localized requests without external analytics/tourverse tracking

async function loadAgeCategories() {
    const defaultCategories = [
        { "uuid": "bc00da40-875a-459d-9870-45aa94128790", "name": "Младше 10 лет" },
        { "uuid": "1ee62e44-2c42-4f5e-a97f-d5cd38724133", "name": "Старше 10 лет" }
    ];
    localStorage.setItem('ageCategories', JSON.stringify(defaultCategories));
    return defaultCategories;
}

async function createUser(ageCategoryUuid, questionsAmount) {
    const userUuid = localStorage.getItem('user_id') || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'user_' + Date.now());
    localStorage.setItem('user_id', userUuid);
    return {
        status: "success",
        user_uuid: userUuid,
        age_category_uuid: ageCategoryUuid,
        questions_amount: questionsAmount
    };
}

async function createStatistics(sceneUuid, station = null, points = null) {
    // Analytics request disabled
    return { status: "success" };
}

async function activateUnauth(sceneUuid) {
    // Analytics request disabled
    return { status: "success" };
}