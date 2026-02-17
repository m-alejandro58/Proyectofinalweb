
from PIL import Image
from collections import Counter
import sys

def get_dominant_color(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGB")
        img = img.resize((100, 100)) # Resize to speed up
        pixels = list(img.getdata())
        # Filter out white/black/grays to find the "brand" color
        filtered_pixels = [
            p for p in pixels 
            if not (p[0] > 240 and p[1] > 240 and p[2] > 240) and # Not white
               not (p[0] < 15 and p[1] < 15 and p[2] < 15)        # Not black
        ]
        
        if not filtered_pixels:
            return "No distinct color found"

        counts = Counter(filtered_pixels)
        most_common = counts.most_common(1)[0][0]
        return '#{:02x}{:02x}{:02x}'.format(most_common[0], most_common[1], most_common[2])
    except Exception as e:
        return str(e)

print(get_dominant_color("C:/Users/maiko/.gemini/antigravity/brain/9b11b968-9704-4ec2-9999-d76d1d441492/uploaded_media_0_1770216165571.png"))
