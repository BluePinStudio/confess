import os
import json
from PIL import Image, ImageDraw, ImageFont
import textwrap
import sys
import PIL

# Print Pillow version for debugging
print(f"Pillow version: {PIL.__version__}")

# ==============================
# Configuration Constants
# ==============================
CONFIG = {
    "IMAGE_SIZE": 1080,  # Updated image size for Instagram
    "BACKGROUND_COLOR": (0, 0, 0),  # Black background
    "OUTER_BORDER_COLOR": (200, 0, 0),  # Red border
    "MIDDLE_BORDER_COLOR": (170, 0, 0),  # Darker Red for middle border
    "INNER_BORDER_COLOR": (150, 0, 0),  # Even Darker Red for inner border
    "BORDER_WIDTH": 6,  # Border thickness in pixels
    "TEXT_PADDING": 60,  # Padding inside the borders
    "DATE_FONT_SIZE_START": 50,  # Updated starting font size for date
    "TEXT_FONT_SIZE_START": 60,  # Updated starting font size for confession text
    "HANDLE_TEXT": "@FessToronto",  # Handle string below the logo
    "HANDLE_FONT_SIZE": 40,  # Updated font size for handle text
    "HANDLE_COLOR": (255, 0, 0),  # Red color for handle
    "SUBMIT_TEXT": "Link in bio to submit your own!",  # Submission instructions
    "SUBMIT_FONT_SIZE_START": 40,  # Font size for submit text
    "SUBMIT_COLOR": (255, 255, 255),  # White color for submit text
    "TEXT_WRAP_WIDTH": 40,  # Width for text wrapping
    "FONT_PATH": "fonts/Eating Pasta.ttf",  # Path to a .ttf font file
    "LOGO_PATH": "logos/logo.png",  # Path to your logo image
    "LOGO_SIZE": (200, 200),  # Logo size (width, height)
    "OUTPUT_DIR": "output_images",
    "JSON_FILE": "confessions.json",
    "MIN_FONT_SIZE": 20,  # Minimum font size to attempt
    # Watermark Configuration
    "WATERMARK_TEXT": "FESS",  # Text to be used as watermark
    "WATERMARK_FONT_SIZE": 80,  # Increased font size for watermark text
    "WATERMARK_COLOR": (255, 0, 0),  # Dark red color for watermark
    "WATERMARK_OPACITY": 50,  # Opacity for watermark (0-255)
    "WATERMARK_SPACING": 279,  # Reduced spacing between watermark texts
}

# ==============================
# Determine Resampling Filter
# ==============================
try:
    # For Pillow >=10
    RESAMPLING_FILTER = Image.Resampling.LANCZOS
except AttributeError:
    # For Pillow <10
    RESAMPLING_FILTER = Image.LANCZOS  # ANTIALIAS deprecated

# ==============================
# Ensure Output Directory Exists
# ==============================
if not os.path.exists(CONFIG["OUTPUT_DIR"]):
    try:
        os.makedirs(CONFIG["OUTPUT_DIR"])
        print(f"Created output directory at '{CONFIG['OUTPUT_DIR']}'.")
    except Exception as e:
        print(f"Failed to create output directory '{CONFIG['OUTPUT_DIR']}': {e}")
        sys.exit(1)
else:
    print(f"Output directory '{CONFIG['OUTPUT_DIR']}' already exists.")

# ==============================
# Load Confessions from JSON
# ==============================
def load_confessions(json_path):
    print(f"Attempting to load JSON file from '{json_path}'...")
    if not os.path.exists(json_path):
        print(f"Error: JSON file '{json_path}' does not exist.")
        sys.exit(1)
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            confessions = json.load(f)
        print(f"Successfully loaded {len(confessions)} confessions.")
        return confessions
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON file '{json_path}': {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error while loading JSON file '{json_path}': {e}")
        sys.exit(1)


# ==============================
# Load Font
# ==============================
def load_font(font_path, size, font_role):
    print(f"Loading font for {font_role} from '{font_path}' with size {size}...")
    if not os.path.exists(font_path):
        print(
            f"Warning: Font file '{font_path}' not found. Using default font for {font_role}."
        )
        return ImageFont.load_default()
    try:
        font = ImageFont.truetype(font_path, size)
        print(f"Successfully loaded font for {font_role}.")
        return font
    except Exception as e:
        print(f"Error loading font '{font_path}' for {font_role}: {e}")
        print(f"Using default font for {font_role}.")
        return ImageFont.load_default()


# ==============================
# Load Logo
# ==============================
def load_logo(logo_path):
    print(f"Loading logo from '{logo_path}'...")
    if not os.path.exists(logo_path):
        print(f"Warning: Logo file '{logo_path}' does not exist. Skipping logo.")
        return None
    try:
        logo = Image.open(logo_path).convert("RGBA")
        logo.thumbnail(CONFIG["LOGO_SIZE"], RESAMPLING_FILTER)
        print(f"Successfully loaded and resized logo to {logo.size}.")
        return logo
    except Exception as e:
        print(f"Error loading logo '{logo_path}': {e}")
        return None


# ==============================
# Calculate Text Size
# ==============================
def get_text_size(draw, text, font, align="left"):
    """
    Calculate the width and height of the given text using the provided font.
    Uses textbbox for Pillow >=10 and multiline_textsize for older versions.
    """
    try:
        # For Pillow >=10
        bbox = draw.textbbox((0, 0), text, font=font, align=align)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        return width, height
    except AttributeError:
        # For Pillow <10
        return draw.multiline_textsize(text, font=font)


# ==============================
# Fit Text Into Box Function
# ==============================
def fit_text_into_box(draw, text, font_path, initial_font_size, max_width, max_height):
    """
    Adjusts the font size so that the text fits within the specified box.
    Returns the fitted font and the wrapped text.
    """
    font_size = initial_font_size
    while font_size >= CONFIG["MIN_FONT_SIZE"]:
        try:
            font = ImageFont.truetype(font_path, font_size)
        except:
            font = ImageFont.load_default()
        # Wrap text
        wrapped_text = textwrap.fill(text, width=CONFIG["TEXT_WRAP_WIDTH"])
        # Calculate text size
        text_width, text_height = get_text_size(
            draw, wrapped_text, font, align="center"
        )
        if text_width <= max_width and text_height <= max_height:
            return font, wrapped_text
        font_size -= 1
    # If text is still too big, return the smallest font and the wrapped text
    try:
        font = ImageFont.truetype(font_path, CONFIG["MIN_FONT_SIZE"])
    except:
        font = ImageFont.load_default()
    wrapped_text = textwrap.fill(text, width=CONFIG["TEXT_WRAP_WIDTH"])
    return font, wrapped_text


# ==============================
# Create Image for a Confession
# ==============================
def create_image(
    confession, index, logo, date_font, text_font, handle_font, watermark_font
):
    print(f"\nCreating image for confession #{index + 1}...")
    date = confession.get("date", "No Date")
    text = confession.get("text", "No Text")
    promoted = confession.get("promoted", False)

    # Skip promoted confessions
    if promoted:
        print(f"Confession #{index + 1} is promoted. Skipping image generation.")
        return

    # Set border colors
    current_border_color_outer = CONFIG["OUTER_BORDER_COLOR"]
    current_border_color_middle = CONFIG["MIDDLE_BORDER_COLOR"]
    current_border_color_inner = CONFIG["INNER_BORDER_COLOR"]
    border_color_description = "OUTER_BORDER_COLOR (Red), MIDDLE_BORDER_COLOR (Darker Red), and INNER_BORDER_COLOR (Even Darker Red)"
    print(
        f"Confession #{index + 1} is not promoted. Using border colors: {border_color_description}."
    )

    # Create base image
    try:
        image = Image.new(
            "RGB",
            (CONFIG["IMAGE_SIZE"], CONFIG["IMAGE_SIZE"]),
            CONFIG["BACKGROUND_COLOR"],
        )
        draw = ImageDraw.Draw(image)
        print("Created base image with black background.")
    except Exception as e:
        print(f"Error creating base image: {e}")
        return

    # Draw outer border
    try:
        for i in range(CONFIG["BORDER_WIDTH"]):
            draw.rectangle(
                [i, i, CONFIG["IMAGE_SIZE"] - i - 1, CONFIG["IMAGE_SIZE"] - i - 1],
                outline=current_border_color_outer,
            )
        print(
            f"Drew outer border of width {CONFIG['BORDER_WIDTH']} with color {CONFIG['OUTER_BORDER_COLOR']}."
        )
    except Exception as e:
        print(f"Error drawing outer border: {e}")

    # Draw middle border
    try:
        for i in range(CONFIG["BORDER_WIDTH"]):
            draw.rectangle(
                [
                    CONFIG["BORDER_WIDTH"] + i,
                    CONFIG["BORDER_WIDTH"] + i,
                    CONFIG["IMAGE_SIZE"] - CONFIG["BORDER_WIDTH"] - i - 1,
                    CONFIG["IMAGE_SIZE"] - CONFIG["BORDER_WIDTH"] - i - 1,
                ],
                outline=current_border_color_middle,
            )
        print(
            f"Drew middle border of width {CONFIG['BORDER_WIDTH']} with color {CONFIG['MIDDLE_BORDER_COLOR']}."
        )
    except Exception as e:
        print(f"Error drawing middle border: {e}")

    # Draw inner border
    try:
        for i in range(CONFIG["BORDER_WIDTH"]):
            draw.rectangle(
                [
                    2 * CONFIG["BORDER_WIDTH"] + i,
                    2 * CONFIG["BORDER_WIDTH"] + i,
                    CONFIG["IMAGE_SIZE"] - 2 * CONFIG["BORDER_WIDTH"] - i - 1,
                    CONFIG["IMAGE_SIZE"] - 2 * CONFIG["BORDER_WIDTH"] - i - 1,
                ],
                outline=current_border_color_inner,
            )
        print(
            f"Drew inner border of width {CONFIG['BORDER_WIDTH']} with color {CONFIG['INNER_BORDER_COLOR']}."
        )
    except Exception as e:
        print(f"Error drawing inner border: {e}")

    # ==============================
    # Add Watermark
    # ==============================
    try:
        watermark = Image.new("RGBA", image.size, (0, 0, 0, 0))
        watermark_draw = ImageDraw.Draw(watermark)
        watermark_text = CONFIG["WATERMARK_TEXT"]
        watermark_font_size = CONFIG["WATERMARK_FONT_SIZE"]
        try:
            watermark_font_loaded = ImageFont.truetype(
                CONFIG["FONT_PATH"], watermark_font_size
            )
        except:
            watermark_font_loaded = ImageFont.load_default()
        watermark_color = CONFIG["WATERMARK_COLOR"] + (CONFIG["WATERMARK_OPACITY"],)

        spacing = CONFIG["WATERMARK_SPACING"]
        # Calculate diagonal step to place text diagonally without too much overlap
        diagonal = int((2 * CONFIG["IMAGE_SIZE"] ** 2) ** 0.5)

        # Expanded range to ensure coverage after rotation
        for x in range(-CONFIG["IMAGE_SIZE"], CONFIG["IMAGE_SIZE"] * 2, spacing):
            for y in range(-CONFIG["IMAGE_SIZE"], CONFIG["IMAGE_SIZE"] * 2, spacing):
                watermark_draw.text(
                    (x, y),
                    watermark_text,
                    font=watermark_font_loaded,
                    fill=watermark_color,
                )

        rotated_watermark = watermark.rotate(0, expand=True)
        rotated_watermark = rotated_watermark.resize(image.size, RESAMPLING_FILTER)
        image = image.convert("RGBA")
        watermark_layer = rotated_watermark
        image = Image.alpha_composite(image, watermark_layer)
        image = image.convert("RGB")
        draw = ImageDraw.Draw(image)
        print("Added watermark to the image.")
    except Exception as e:
        print(f"Error adding watermark: {e}")

    # ==============================
    # Paste logo
    # ==============================
    if logo:
        try:
            logo_width, logo_height = logo.size
            logo_position = (
                (CONFIG["IMAGE_SIZE"] - logo_width) // 2,
                2 * CONFIG["BORDER_WIDTH"] + CONFIG["TEXT_PADDING"] // 2,
            )
            image.paste(logo, logo_position, logo)
            print(f"Pasted logo at position {logo_position}.")
        except Exception as e:
            print(f"Error pasting logo: {e}")
            logo_position = (
                0,
                0,
            )  # Assign default position to prevent UnboundLocalError
    else:
        logo_position = (0, 0)  # Default position if logo is missing
        print("No logo to paste.")

    # Draw handle text below logo
    try:
        handle_text = CONFIG["HANDLE_TEXT"]
        handle_font_fitted, handle_wrapped = fit_text_into_box(
            draw=draw,
            text=handle_text,
            font_path=CONFIG["FONT_PATH"],
            initial_font_size=CONFIG["HANDLE_FONT_SIZE"],
            max_width=CONFIG["IMAGE_SIZE"]
            - 4 * CONFIG["BORDER_WIDTH"]
            - 2 * CONFIG["TEXT_PADDING"],
            max_height=CONFIG["HANDLE_FONT_SIZE"]
            + 10,  # Slightly larger than font size
        )
        handle_width, handle_height = get_text_size(
            draw, handle_wrapped, handle_font_fitted, align="center"
        )
        handle_position = (
            (CONFIG["IMAGE_SIZE"] - handle_width) // 2,
            logo_position[1] + (logo.size[1] if logo else 0) + 10,
        )
        draw.text(
            handle_position,
            handle_wrapped,
            font=handle_font_fitted,
            fill=CONFIG["HANDLE_COLOR"],
            align="center",
        )
        print(f"Drew handle text '{handle_wrapped}' at position {handle_position}.")
    except Exception as e:
        handle_position = (0, 0)  # Assign default position if handle text fails
        print(f"Error drawing handle text: {e}")

    # Draw submit text below handle
    try:
        submit_text = CONFIG["SUBMIT_TEXT"]
        submit_font_fitted, submit_wrapped = fit_text_into_box(
            draw=draw,
            text=submit_text,
            font_path=CONFIG["FONT_PATH"],
            initial_font_size=CONFIG["SUBMIT_FONT_SIZE_START"],
            max_width=CONFIG["IMAGE_SIZE"]
            - 4 * CONFIG["BORDER_WIDTH"]
            - 2 * CONFIG["TEXT_PADDING"],
            max_height=CONFIG["SUBMIT_FONT_SIZE_START"]
            + 10,  # Slightly larger than font size
        )
        submit_width, submit_height = get_text_size(
            draw, submit_wrapped, submit_font_fitted, align="center"
        )
        submit_position = (
            (CONFIG["IMAGE_SIZE"] - submit_width) // 2,
            handle_position[1] + handle_height + 10,
        )
        draw.text(
            submit_position,
            submit_wrapped,
            font=submit_font_fitted,
            fill=CONFIG["SUBMIT_COLOR"],
            align="center",
        )
        print(f"Drew submit text '{submit_wrapped}' at position {submit_position}.")
    except Exception as e:
        submit_position = (0, 0)  # Assign default position if submit text fails
        print(f"Error drawing submit text: {e}")

    # Define text box boundaries
    text_box_top = submit_position[1] + submit_height + 20
    text_box_bottom = (
        CONFIG["IMAGE_SIZE"] - 2 * CONFIG["BORDER_WIDTH"] - CONFIG["TEXT_PADDING"]
    )
    text_box_left = 2 * CONFIG["BORDER_WIDTH"] + CONFIG["TEXT_PADDING"]
    text_box_right = (
        CONFIG["IMAGE_SIZE"] - 2 * CONFIG["BORDER_WIDTH"] - CONFIG["TEXT_PADDING"]
    )

    max_text_width = text_box_right - text_box_left
    max_text_height = text_box_bottom - text_box_top

    # Adjust font sizes to fit the text within the text box
    try:
        # Fit date
        date_font_fitted, date_wrapped = fit_text_into_box(
            draw=draw,
            text=date,
            font_path=CONFIG["FONT_PATH"],
            initial_font_size=CONFIG["DATE_FONT_SIZE_START"],
            max_width=max_text_width,
            max_height=max_text_height
            * 0.1,  # Allocate 10% of text box height for date
        )

        # Fit confession text
        text_font_fitted, text_wrapped = fit_text_into_box(
            draw=draw,
            text=text,
            font_path=CONFIG["FONT_PATH"],
            initial_font_size=CONFIG["TEXT_FONT_SIZE_START"],
            max_width=max_text_width,
            max_height=max_text_height
            * 0.85,  # Allocate 85% of text box height for confession
        )

        # Calculate total content height
        date_width, date_height = get_text_size(
            draw, date_wrapped, date_font_fitted, align="center"
        )
        text_width, text_height = get_text_size(
            draw, text_wrapped, text_font_fitted, align="center"
        )
        total_content_height = date_height + text_height + 30  # Additional spacing

        # Calculate starting y position to center the content vertically within the text box
        starting_y = text_box_top + (max_text_height - total_content_height) / 2

        # Ensure starting_y is not negative
        starting_y = max(starting_y, CONFIG["BORDER_WIDTH"] + CONFIG["TEXT_PADDING"])

        # Draw date
        date_position = ((CONFIG["IMAGE_SIZE"] - date_width) // 2, starting_y)
        draw.text(
            date_position,
            date_wrapped,
            font=date_font_fitted,
            fill=(255, 0, 0),
            align="center",
        )  # Red color
        print(f"Drew date '{date_wrapped}' at position {date_position}.")
        starting_y += date_height + 10  # Add spacing after date

        # Draw confession text
        text_position = ((CONFIG["IMAGE_SIZE"] - text_width) // 2, starting_y)
        draw.text(
            text_position,
            text_wrapped,
            font=text_font_fitted,
            fill=(255, 255, 255),
            align="center",
        )  # White color
        print(f"Drew confession text at position {text_position}.")
    except Exception as e:
        print(f"Error drawing text: {e}")

    # Save image
    try:
        output_filename = f"confession_{index + 1}.png"
        output_path = os.path.join(CONFIG["OUTPUT_DIR"], output_filename)
        image.save(output_path)
        print(f"Saved image to '{output_path}'.")
    except Exception as e:
        print(f"Error saving image '{output_filename}': {e}")


# ==============================
# Main Function
# ==============================
def main():
    print("Starting the confession image creation script.")

    # Load confessions
    confessions = load_confessions(CONFIG["JSON_FILE"])
    if not isinstance(confessions, list):
        print(
            f"Error: Expected a list of confessions in '{CONFIG['JSON_FILE']}', but got {type(confessions)}."
        )
        sys.exit(1)

    # Load logo once
    logo = load_logo(CONFIG["LOGO_PATH"])

    # Load fonts
    date_font = load_font(CONFIG["FONT_PATH"], CONFIG["DATE_FONT_SIZE_START"], "date")
    text_font = load_font(CONFIG["FONT_PATH"], CONFIG["TEXT_FONT_SIZE_START"], "text")
    handle_font = load_font(CONFIG["FONT_PATH"], CONFIG["HANDLE_FONT_SIZE"], "handle")
    watermark_font = load_font(
        CONFIG["FONT_PATH"], CONFIG["WATERMARK_FONT_SIZE"], "watermark"
    )

    # Process each confession
    for index, confession in enumerate(confessions):
        if not isinstance(confession, dict):
            print(
                f"Warning: Confession at index {index} is not a dictionary. Skipping."
            )
            continue
        create_image(
            confession, index, logo, date_font, text_font, handle_font, watermark_font
        )

    print("\nAll confessions have been processed.")


# ==============================
# Entry Point
# ==============================
if __name__ == "__main__":
    main()
