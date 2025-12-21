from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

def create_midnight_library_pdf():
    filename = "data/files/midnight_library.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Page 1 - Title Page
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(width/2, height - 2*inch, "The Midnight Library")
    c.setFont("Helvetica", 24)
    c.drawCentredString(width/2, height - 2.8*inch, "by Matt Haig")
    c.setFont("Helvetica-Oblique", 14)
    c.drawCentredString(width/2, 1.5*inch, "Sample PDF for Testing")
    c.showPage()
    
    # Page 2 - Chapter 1
    c.setFont("Helvetica-Bold", 24)
    c.drawString(inch, height - inch, "Chapter 1")
    c.setFont("Helvetica-Bold", 18)
    c.drawString(inch, height - 1.5*inch, "The Library")
    c.setFont("Helvetica", 12)
    
    text = """
    Between life and death there is a library, and within that library, 
    the shelves go on forever. Every book provides a chance to try 
    another life you could have lived. To see how things would be if 
    you had made other choices...
    
    Would you have done anything different, if you had the chance to 
    undo your regrets?
    
    Nora Seed finds herself faced with this decision. Faced with the 
    possibility of changing her life for a new one, following a different 
    career, undoing old breakups, realizing her dreams of becoming a 
    glaciologist; she must search within herself as she travels through 
    the Midnight Library to decide what is truly fulfilling in life, and 
    what makes it worth living in the first place.
    """
    
    y = height - 2*inch
    for line in text.split('\n'):
        c.drawString(inch, y, line.strip())
        y -= 0.3*inch
    c.showPage()
    
    # Page 3 - More content
    c.setFont("Helvetica", 12)
    c.drawString(inch, height - inch, "The library was infinite.")
    y = height - 1.5*inch
    
    content = """
    The shelves stretched on forever, in every direction. Books of every 
    color and size lined the endless rows. Each spine bore a title that 
    represented a life - a different version of Nora's existence.
    
    "Where am I?" Nora whispered, her voice echoing in the vast space.
    
    A figure emerged from between the shelves. It was Mrs. Elm, her old 
    school librarian, looking exactly as Nora remembered her from years ago.
    
    "You are in the Midnight Library, Nora," Mrs. Elm said gently. "This is 
    the place between life and death. Every book here is a different life 
    you could have lived."
    
    Nora looked around in wonder. "How many are there?"
    
    "As many as there are possibilities," Mrs. Elm replied. "Every decision 
    you've ever made has created a branch, a new timeline. Here, you can 
    explore them all."
    """
    
    for line in content.split('\n'):
        if y < inch:
            c.showPage()
            y = height - inch
        c.drawString(inch, y, line.strip())
        y -= 0.3*inch
    c.showPage()
    
    # Page 4
    c.setFont("Helvetica-Bold", 16)
    c.drawString(inch, height - inch, "The Book of Regrets")
    c.setFont("Helvetica", 12)
    y = height - 1.5*inch
    
    page4_content = """
    Mrs. Elm led Nora to a large, heavy book sitting on a pedestal. Unlike 
    the others, this one was open, its pages filled with handwritten text.
    
    "This," Mrs. Elm explained, "is your Book of Regrets. Every regret you've 
    ever had is recorded here."
    
    Nora approached hesitantly and began to read:
    
    - Not pursuing music professionally
    - Letting Dan go
    - Never traveling to Australia
    - Giving up swimming
    - Not spending more time with her father
    - Abandoning her philosophy degree
    
    The list went on and on. Each entry was a painful reminder of a path not 
    taken, a choice she wished she could undo.
    
    "Can I change them?" Nora asked, tears welling in her eyes.
    
    "You can experience what would have happened if you had made different 
    choices," Mrs. Elm said. "Each book on these shelves represents a life 
    where you made a different decision. You can live them, Nora. You can 
    see what might have been."
    """
    
    for line in page4_content.split('\n'):
        if y < inch:
            c.showPage()
            y = height - inch
        c.drawString(inch, y, line.strip())
        y -= 0.3*inch
    c.showPage()
    
    # Page 5 - Final page
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, height/2 + inch, "To be continued...")
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, height/2, "This is a sample PDF created for testing the in-app reader.")
    c.drawCentredString(width/2, height/2 - 0.3*inch, "The actual book contains many more pages and chapters.")
    
    c.save()
    print(f"Created {filename} with 5 pages")

if __name__ == "__main__":
    create_midnight_library_pdf()
