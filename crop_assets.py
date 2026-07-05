import os
from PIL import Image

def main():
    workspace_dir = r"c:\Users\Krushna\OneDrive\Documents\morya hospital portfolio"
    assets_dir = os.path.join(workspace_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    print("Starting asset extraction...")
    
    crops = {
        # Doctors
        "doctor_rashmi.jpg": {
            "file": "Screenshot 2026-07-05 113446.png",
            "bbox": (410, 395, 916, 916)
        },
        "doctor_vaibhav.jpg": {
            "file": "Screenshot 2026-07-05 113446.png",
            "bbox": (980, 395, 1486, 916)
        },
        # Departments
        "dept_medicine.jpg": {
            "file": "Screenshot 2026-07-05 113456.png",
            "bbox": (143, 346, 613, 615)
        },
        "dept_surgery.jpg": {
            "file": "Screenshot 2026-07-05 113456.png",
            "bbox": (713, 346, 1183, 615)
        },
        "dept_gynaecology.jpg": {
            "file": "Screenshot 2026-07-05 113456.png",
            "bbox": (1283, 346, 1757, 615)
        },
        # Facilities batch 1
        "fac_inpatient.jpg": {
            "file": "Screenshot 2026-07-05 113504.png",
            "bbox": (116, 445, 640, 834)
        },
        "fac_icu.jpg": {
            "file": "Screenshot 2026-07-05 113504.png",
            "bbox": (686, 445, 1210, 834)
        },
        "fac_operative.jpg": {
            "file": "Screenshot 2026-07-05 113504.png",
            "bbox": (1256, 445, 1780, 834)
        },
        # Facilities batch 2
        "fac_emergency.jpg": {
            "file": "Screenshot 2026-07-05 113514.png",
            "bbox": (116, 16, 640, 405)
        },
        "fac_ambulance.jpg": {
            "file": "Screenshot 2026-07-05 113514.png",
            "bbox": (686, 16, 1210, 405)
        },
        "fac_lab.jpg": {
            "file": "Screenshot 2026-07-05 113514.png",
            "bbox": (1256, 16, 1780, 405)
        },
        # FAQ Graphic (Question mark)
        "faq_qmark.png": {
            "file": "Screenshot 2026-07-05 113522.png",
            "bbox": (60, 180, 400, 880)
        },
        # Gallery Poster
        "gallery_poster.jpg": {
            "file": "Screenshot 2026-07-05 113532.png",
            "bbox": (358, 337, 1561, 606)
        },
        # Map
        "map.jpg": {
            "file": "Screenshot 2026-07-05 113543.png",
            "bbox": (722, 378, 1174, 647)
        }
    }
    
    for filename, info in crops.items():
        src_path = os.path.join(workspace_dir, info["file"])
        if not os.path.exists(src_path):
            print(f"Error: Source image {src_path} not found.")
            continue
        
        img = Image.open(src_path)
        bbox = info["bbox"]
        
        # Ensure left < right and top < bottom in bbox coordinates
        # Notice "dept_surgery" in dict had (713, 1183, 1183, 615). Let's fix that!
        left, top, right, bottom = bbox
        if left > right:
            left, right = right, left
        if top > bottom:
            top, bottom = bottom, top
            
        cropped = img.crop((left, top, right, bottom))
        
        # Save to assets
        dest_path = os.path.join(assets_dir, filename)
        # Convert to RGB if saving as jpg
        if filename.endswith(".jpg") and cropped.mode in ("RGBA", "P"):
            cropped = cropped.convert("RGB")
        cropped.save(dest_path)
        print(f"Saved: {filename} ({cropped.size[0]}x{cropped.size[1]})")

if __name__ == "__main__":
    main()
