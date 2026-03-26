import argparse
import os
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
import pandas as pd

def wrap_text(text, font, max_width):
    lines = []
    words = text.split()
    line = ""
    for word in words:
        test_line = f"{line} {word}".strip()
        text_width = font.getbbox(test_line)[2]
        if text_width <= max_width:
            line = test_line
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines

def generate_id_card(template_path, photo_path, rollno, dob, mobile, address, output_image_path, output_pdf_path, name=""):
    try:
        dob = pd.to_datetime(dob).strftime('%d/%m/%Y')

        template = Image.open(template_path)
        draw = ImageDraw.Draw(template)

        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",25)
        draw.text((220, 472), name, fill="black", font=font)
        draw.text((220, 528), rollno, fill="black", font=font)
        draw.text((220, 584), dob, fill="black", font=font)
        draw.text((220, 640), mobile, fill="black", font=font)

        address_lines = wrap_text(address, font, max_width=300)
        y_address = 696
        for line in address_lines:
            draw.text((220, y_address), line, fill="black", font=font)
            y_address += font.getbbox(line)[3] + 0.2

        photo = Image.open(photo_path).resize((200, 250))
        template.paste(photo, (217, 188))

#         barcode_path = os.path.join('barcodes', f"{rollno}.png")
        barcode_path = os.path.join(r"R:\Work\sa_management\utils\barcodes", f"{rollno}.png")
        if os.path.exists(barcode_path):
            barcode_image = Image.open(barcode_path).resize((323, 116))
            template.paste(barcode_image, (155, 793))

        template.save(output_image_path)

        c = canvas.Canvas(output_pdf_path, pagesize=A4)
        c.drawImage(output_image_path, 50, 50, width=500, height=700)
        c.save()

        print(f"ID card generated for {name} - {rollno}")

    except Exception as e:
        print(f"[ERROR] Error generating ID card for {name}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Generate ID Card from terminal input.")
    parser.add_argument('--name', required=True, help="Name of the student")
    parser.add_argument('--dob', required=True, help="Date of birth (YYYY-MM-DD or DD/MM/YYYY)")
    parser.add_argument('--address', required=True, help="Address")
    parser.add_argument('--mobile', required=True, help="Mobile number")
    parser.add_argument('--rollno', required=True, help="Roll number")
    parser.add_argument('--photo', required=True, help="Photo File Name")

    args = parser.parse_args()

    # Paths and folders
    template_path = "IDCARD_GSA_FRONT_SIDE_v2@4x.png"
#     photo_folder = "/home/ubuntu/3-Aug/GSA_Backend_05_06/uploads"
    photo_folder = r"R:\Work\sa_management\uploads\academy_admissions"
    image_output_folder = "id_card_output"
    pdf_output_folder = "id_card_output_pdf"

    os.makedirs(image_output_folder, exist_ok=True)
    os.makedirs(pdf_output_folder, exist_ok=True)

    # Prepare file paths
    photo_path = os.path.join(photo_folder, f"{args.photo}")
    output_image_path = os.path.join(image_output_folder, f"{args.rollno}.jpg")
    output_pdf_path = os.path.join(pdf_output_folder, f"{args.rollno}.pdf")

    if not os.path.exists(photo_path):
        print(f"Photo not found for roll number {args.rollno} in {photo_folder}")
        return

    # Generate ID
    generate_id_card(
        template_path=template_path,
        photo_path=photo_path,
        rollno=args.rollno,
        dob=args.dob,
        mobile=args.mobile,
        address=args.address,
        output_image_path=output_image_path,
        output_pdf_path=output_pdf_path,
        name=args.name
    )

if __name__ == "__main__":
    main()
