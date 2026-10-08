# -*- coding: utf-8 -*-
"""
Build the master resident_evil_quest_bank.md file containing all 200 questions
across the 5 question stations (40 questions each), plus an export to JS format.
"""

import os
import sys
import json

# Ensure scripts folder is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from gen_station2 import station_2_questions
from gen_station3 import station_3_questions
from gen_station4 import station_4_questions
from gen_station5 import station_5_questions
from gen_station6 import station_6_questions

stations_data = [
    {
        "station_number": 2,
        "station_quest_num": 1,
        "name": "Станция II: «Колыбель амбиций: Арклей и Особняк Спенсера»",
        "games": "Resident Evil 0 & Resident Evil 1 / Remake",
        "focus": "Истоки вируса Прародитель и Т-вируса, грехопадение ученых (Маркус, Биркин, Спенсер), этика биологических экспериментов, клаустрофобия и саспенс особняка, препарирование эгоизма корпорации Umbrella.",
        "questions": station_2_questions
    },
    {
        "station_number": 3,
        "station_quest_num": 2,
        "name": "Станция III: «Агония Раккун-Сити: Крах цивилизации и судный день»",
        "games": "Resident Evil 2 & Resident Evil 3: Nemesis / Remakes",
        "focus": "Падение мегаполиса, G-вирус и одержимость Биркина, Немезис и Мистер X как неумолимые сталкеры, предательство власти (шеф Айронс), сопутствующий ущерб от ядерной стерилизации и цена человечности посреди руин.",
        "questions": station_3_questions
    },
    {
        "station_number": 4,
        "station_quest_num": 3,
        "name": "Станция IV: «Тень паразитов и глобальная чума: Культы и Трансгуманизм»",
        "games": "Resident Evil 4 & Resident Evil 5",
        "focus": "Религиозный фанатизм и биологический тоталитаризм (Las Plagas, Сэддлер), евгеническая мания величия Альберта Вескера (Уроборос), неоколониализм и эксплуатация развивающихся стран корпорацией Tricell, разрыв шаблонов дневного хоррора.",
        "questions": station_4_questions
    },
    {
        "station_number": 5,
        "station_quest_num": 4,
        "name": "Станция V: «Мировая био-война: Распад личности и бремя вины»",
        "games": "Resident Evil 6, Code: Veronica & Revelations 1-2",
        "focus": "C-вирус и глобальный террор, насилие над идентичностью (Карла Радамес / Ада Вонг), ПТСР Криса Редфилда, искупление Джейка Мюллера, страх как биологический триггер (Т-Фобос), высшее самопожертвование Пирса Ниванса.",
        "questions": station_5_questions
    },
    {
        "station_number": 6,
        "station_quest_num": 5,
        "name": "Станция VI: «Семейный кошмар и первородная плесень: Корни зла»",
        "games": "Resident Evil 7: Biohazard & Resident Evil Village / RE8 (истоки Спенсера, Миранды и намёки на RE9)",
        "focus": "Черная плесень (Мегамицелий), трагедия Эвелины как сироты-биооружия, кошмар распада семьи Бейкеров, Матерь Миранда и истоки Umbrella в культе скорби, великий подвиг отцовства Итана Уинтерса, триумф любви над биологической мутацией.",
        "questions": station_6_questions
    }
]

def generate_markdown():
    root_dir = os.path.dirname(current_dir)
    md_path = os.path.join(root_dir, "resident_evil_quest_bank.md")

    lines = []
    lines.append("# Банк Вопросов для Хоррор-Квеста: «Resident Evil — Цена Человечности»")
    lines.append("")
    lines.append("## Общая Архитектура Квеста (7 Станций)")
    lines.append("")
    lines.append("Квест адаптирован под модель из **7 станций** (1 вводная станция, 5 интерактивных вопросительных станций с банком по 40 вопросов каждая, и 1 финальная станция катарсиса):")
    lines.append("")
    lines.append("1. **Станция 1 (`index.html`)**: **Старт / Пролог** — Активация QR-кода, сканирование выжившего, погружение в атмосферу био-катастрофы, выбор уровня сложности.")
    lines.append("2. **Станция 2 (`mainStation2.html`)**: **Вопросительная Станция I** — «Колыбель амбиций: Арклей и Особняк Спенсера» (RE0 & RE1). *Банк: 40 вопросов.*")
    lines.append("3. **Станция 3 (`mainStation3.html`)**: **Вопросительная Станция II** — «Агония Раккун-Сити: Крах цивилизации» (RE2 & RE3). *Банк: 40 вопросов.*")
    lines.append("4. **Станция 4 (`mainStation4.html`)**: **Вопросительная Станция III** — «Тень паразитов и глобальная чума: Культы и Трансгуманизм» (RE4 & RE5). *Банк: 40 вопросов.*")
    lines.append("5. **Станция 5 (`mainStation5.html`)**: **Вопросительная Станция IV** — «Мировая био-война: Распад личности и бремя вины» (RE6, Code Veronica, Revelations 1-2). *Банк: 40 вопросов.*")
    lines.append("6. **Станция 6 (`mainStation6.html`)**: **Вопросительная Станция V** — «Семейный кошмар и первородная плесень: Корни зла» (RE7, Village / RE8, истоки RE9). *Банк: 40 вопросов.*")
    lines.append("7. **Станция 7 (`final.html`)**: **Финал / Эвакуация** — Подведение итогов выживания, оценка морального профиля игрока, эпилог о силе человеческого духа.")
    lines.append("")
    lines.append("> **Итого в банке вопросов:** 5 вопросительных станций × 40 вопросов = **ровно 200 уникальных вопросов**.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Ключевые Философские и Геймдизайнерские Оси Capcom")
    lines.append("")
    lines.append("Все 200 вопросов спроектированы строго с учетом 4 обязательных аспектов, заданных концепцией Resident Evil:")
    lines.append("1. **Мораль и Биоэтика:** Конфликт корпоративной алчности и ценности человеческой жизни; грех создания чудовищ ради власти; оправдание 'высшего блага' ценой невинных; верность долгу и товарищам.")
    lines.append("2. **Причина и Следствие:** Эффект домино биологических катастроф; почему каждое преступление против природы (от цветка Sonnentreppe и плесени Миранды до вирусов T, G, C и Уроборос) неминуемо оборачивается возмездием против создателей.")
    lines.append("3. **Хоррор и Саспенс:** Механики клаустрофобии, дефицита ресурсов (Ink Ribbon, патроны к магнуму), аудиальный террор (шаги Мистера X, бензопила Сальвадора, прерывистое дыхание Регенерадора, плач плода в Доме Беневьенто), вид от первого лица и психологический ужас боди-хоррора.")
    lines.append("4. **Гуманистический Посыл Capcom:** Беспощадная критика корпоратократии, неоколониализма и трансгуманизма; триумф простого человека (Итана Уинтерса, Леона Кеннеди, Джилл Валентайн, Клэр Редфилд), побеждающего чудовищ не мутациями, а любовью, семьей и верностью совести.")
    lines.append("")
    lines.append("---")
    lines.append("")

    total_count = 0
    for s in stations_data:
        lines.append(f"## {s['name']}")
        lines.append(f"**Охват канона:** {s['games']}")
        lines.append(f"**Тематический фокус:** {s['focus']}")
        lines.append(f"**Количество вопросов в банке:** {len(s['questions'])}")
        lines.append("")
        
        for q in s["questions"]:
            total_count += 1
            lines.append(f"### [Станция {s['station_number']} | Вопрос {q['id']}/40] {q['title']}")
            lines.append(f"- **Категория:** `{q['theme']}`")
            lines.append(f"- **Вопрос:** **{q['question']}**")
            lines.append("- **Варианты ответов:**")
            for idx, opt in enumerate(q["options"]):
                letter = chr(ord('A') + idx)
                mark = " *(Правильный ответ)*" if idx == q["correctIndex"] else ""
                lines.append(f"  - **[{letter}]** {opt}{mark}")
            lines.append(f"- **Правильный индекс:** `{q['correctIndex']}` (Вариант {chr(ord('A') + q['correctIndex'])})")
            lines.append(f"- **Пояснение успеха (Right Text):** {q['rightText']}")
            lines.append(f"- **Пояснение ошибки (Wrong Text):** {q['wrongText']}")
            lines.append("")
        lines.append("---")
        lines.append("")

    lines.append("## Руководство по интеграции в движок квеста")
    lines.append("")
    lines.append("### 1. Архитектура HTML-страниц")
    lines.append("Для перехода от 5 станций к 7 необходимо:")
    lines.append("- Сохранить `index.html` как **Станцию 1** (Старт).")
    lines.append("- Использовать `mainStation2.html` как **Станцию 2** (ссылается на `mainStation3.html`).")
    lines.append("- Использовать `mainStation3.html` как **Станцию 3** (ссылается на `mainStation4.html`).")
    lines.append("- Использовать `mainStation4.html` как **Станцию 4** (ссылается на `mainStation5.html`).")
    lines.append("- Создать `mainStation5.html` как **Станцию 5** (ссылается на `mainStation6.html`).")
    lines.append("- Создать `mainStation6.html` как **Станцию 6** (ссылается на `final.html`).")
    lines.append("- Использовать `final.html` как **Станцию 7** (Финал).")
    lines.append("")
    lines.append("### 2. Подключение банка в `src/js/station-configs.js`")
    lines.append("Сгенерированный файл `src/js/resident_evil_station_configs.js` содержит полную структуру конфигураций станций 2, 3, 4, 5, 6 в точном формате движка игры с массивами `questionPool` и `questionPoolTenn`.")
    lines.append("")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Successfully generated {md_path} with {total_count} questions.")

def generate_js_config():
    root_dir = os.path.dirname(current_dir)
    js_path = os.path.join(root_dir, "src", "js", "resident_evil_station_configs.js")

    configs = {}
    next_map = {
        2: "mainStation3.html",
        3: "mainStation4.html",
        4: "mainStation5.html",
        5: "mainStation6.html",
        6: "final.html"
    }

    video_prefixes = {
        2: "ii",
        3: "iii",
        4: "iv",
        5: "v",
        6: "vi"
    }

    for s in stations_data:
        st_num = s["station_number"]
        pool_18 = []
        pool_30 = []
        pfx = video_prefixes[st_num]

        for idx, q in enumerate(s["questions"]):
            # Split exactly in half: first 20 questions for 18+, next 20 for 30+
            age_group = "18+" if idx < 20 else "30+"
            item = {
                "id": q["id"],
                "title": q["title"],
                "question": q["question"],
                "options": q["options"],
                "correctIndex": q["correctIndex"],
                "rightText": q["rightText"],
                "wrongText": q["wrongText"],
                "theme": q["theme"],
                "ageGroup": age_group
            }
            if idx < 20:
                pool_18.append(item)
            else:
                pool_30.append(item)
        
        configs[st_num] = {
            "name": s["name"],
            "games": s["games"],
            "nextStation": next_map[st_num],
            "introVideo": f"{st_num}station/{pfx}_start",
            "correctAnswerVideo": f"{st_num}station/{pfx}_yes",
            "wrongAnswerVideo": f"{st_num}station/{pfx}_no",
            "stationEndVideo": f"{st_num}station/{pfx}_end",
            "waitingVideo": "general/wait",
            "waitingSongVideo": "general/wait_song",
            "wrongStationVideo": "general/lost",
            "questionPool": pool_18,
            "questionPoolTenn": pool_30,
            "questionPool18": pool_18,
            "questionPool30": pool_30
        }

    js_code = "// Resident Evil Quest Configs for 7-station engine\n"
    js_code += "// Total: 5 question stations (Stations 2..6) x 40 questions = 200 questions\n"
    js_code += "// Split 50/50: 20 questions (18+) and 20 questions (30+) per station\n\n"
    js_code += "const residentEvilStationConfigs = " + json.dumps(configs, ensure_ascii=False, indent=2) + ";\n\n"
    js_code += "if (typeof module !== 'undefined' && module.exports) {\n"
    js_code += "  module.exports = residentEvilStationConfigs;\n"
    js_code += "}\n"

    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_code)
    print(f"Successfully generated {js_path}.")

if __name__ == "__main__":
    generate_markdown()
    generate_js_config()
