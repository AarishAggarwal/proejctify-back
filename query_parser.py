import openai
import os
openai.api_key = os.getenv("OPENAI_API_KEY")



def extract_topic_from_input(user_query):
    prompt = f"""
Input: "{user_query}"

Extract only the 2-3 most relevant keywords that represent the main topic or domain of the user's request.
Do NOT explain or generate. Just return keywords. All lowercase.

Examples:
- Input: "Give me some cool ideas about eco-friendly tech"
  Output: eco-friendly technology

- Input: "I want a project to save water and recycle stuff"
  Output: water recycling

- Input: "{user_query}"
  Output:
"""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            temperature=0,
            max_tokens=10,
            messages=[
                {"role": "system", "content": "You extract only the topic of a query, like a search engine."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content.strip().lower()
    except Exception as e:
        print(f"❌ Smart parser error: {e}")
        return user_query  # fallback
