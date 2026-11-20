"""Make a short, captioned explanation of the worked and modeled cases."""
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DATA = ROOT / "model/data"
PAPER = "#f3f5ed"
GREEN = "#1d5e46"
INK = "#122e25"
MUTED = "#476458"
LIME = "#def09a"
WHITE = "#fffefa"
LINE = "#b4cbb7"
AMBER = "#f3dfc8"


def font(size, bold=False):
    filename = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(filename, size)


def wrap(draw, at, text, face, color, max_width, leading=None):
    x, y = at
    line = ""
    height = leading or int(face.size * 1.35)
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if line and draw.textlength(candidate, font=face) > max_width:
            draw.text((x,y), line, fill=color, font=face)
            y += height
            line = word
        else:
            line = candidate
    if line:
        draw.text((x,y), line, fill=color, font=face)
    return y + height


def screen(index, title, subtitle, caption):
    frame = Image.new("RGB", (1280,720), PAPER)
    draw = ImageDraw.Draw(frame)
    draw.rectangle((0,0,1280,65), fill=INK)
    draw.rounded_rectangle((41,18,70,47),radius=7,fill=LIME)
    for row,size in enumerate([15,12,8]):
        draw.line((47,25+6*row,47+size,25+6*row),fill=INK,width=2)
    draw.text((83,19), "RescueFit PEI", font=font(21,True), fill=WHITE)
    draw.text((1050,24), "MODEL WALKTHROUGH", font=font(14,True), fill=LIME)
    draw.text((52,97), title, font=font(43,True), fill=INK)
    wrap(draw,(53,155),subtitle,font(23),MUTED,1160,29)
    draw.rectangle((0,599,1280,720),fill=INK)
    wrap(draw,(54,620),caption,font(23),WHITE,1150,30)
    draw.text((54,689),"IMPAC 2026  /  Innovation Stream  /  Simulated demonstration",fill="#d1dfd3",font=font(14))
    draw.text((1178,688),f"{index} / 8",fill=LIME,font=font(14,True))
    return frame,draw


def tiles(draw, data, top=260):
    gap = 15
    width = (1172-gap*(len(data)-1))//len(data)
    for i,(value,label,fill) in enumerate(data):
        x=54+i*(width+gap)
        draw.rounded_rectangle((x,top,x+width,top+145),radius=17,fill=fill,outline=LINE,width=2)
        draw.text((x+17,top+18),value,font=font(37,True),fill=INK)
        wrap(draw,(x+17,top+78),label,font(19,True),MUTED,width-32,25)


def panel(draw, y, spans, note):
    x=54
    for weight,lab,color in spans:
        width=1172*weight
        draw.rectangle((x,y,x+width,y+68),fill=color)
        draw.text((x+15,y+18),lab,font=font(24,True),fill=INK)
        x+=width
    wrap(draw,(55,y+90),note,font(22),MUTED,1170)


def main():
    r=json.loads((DATA/"scenario_results.json").read_text())
    no_alt=json.loads((DOCS/"sensitivity_results.json").read_text())["scenarios"][0]
    base,fit=r["baseline"],r["rescuefit"]
    delta=fit["kg_used"]-base["kg_used"]
    unallocated=fit["kg_unallocated"]-base["kg_unallocated"]
    no_alt_use=no_alt["paired_delta"]["kg_used_increase"]["mean"]
    total_days,total_runs=r["days"],r["seeds"]
    scenes=[
        ("A kitchen receives 12 kg of carrots", "Begin with a reviewed, already-collected example lot.",
         "Enter a donor message or attach a label photo. Staff review the item, measured weight, storage and the use window.",
         [("DEMO-001","Stable lot identifier",WHITE),("12 kg","Collected carrots",LIME),("Day 2","Reviewed use-by day",WHITE)],13),
        ("Work out how much can fit", "The fit check compares the planned service, stock and preparation capacity.",
         "A soup service needs 8 kg and there are 2 kg on hand. That leaves space in the recipe for 6 kg of this lot.",
         [("8 kg","Needed for the planned soup",WHITE),("2 kg","Already in inventory",WHITE),("6 kg","Allocate to the kitchen",LIME)],14),
        ("Review the remaining 6 kg", "The map ranks modeled recipients by distance after storage and use checks.",
         "If the first candidate is unavailable, select another in the draft. Keep any unplaced quantity in the ledger.",
         [("6 kg","Kitchen allocation",LIME),("6 kg","Pending handoff",AMBER),("0 kg","Transferred so far",WHITE)],13),
        ("Confirm, then record the handoff", "A promised pickup and the physical transfer are separate events.",
         "After the simulated handoff, 6 kg moved to the recipient. Food used stays at zero until preparation is recorded.",
         None,14),
        ("Send the usable food to the meal plan", "RescueFit also shows which planned purchases can still be adjusted.",
         "Six kilograms replaces an adjustable carrot purchase. With the sample price and handling cost, the proposed net change is CAD 13.",
         [("Day 1","Carrot and lentil soup",WHITE),("−6 kg","Carrots on the shopping list",LIME),("CAD 13","Illustrative purchasing benefit",WHITE)],13),
        ("Compare three policies", f"The reference compares {total_runs} paired runs of the same {total_days}-day scenario.",
         "The fit plus redirect policy used more food than storage only in the modeled reference. It also left more weight unallocated.",
         [(f"+{delta:,.0f} kg","Food used",LIME),(f"+{unallocated:,.0f} kg","Unallocated",AMBER),
          (f"{base['kg_wasted_at_agency']-fit['kg_wasted_at_agency']:,.0f} kg","Less expiry at kitchens",WHITE)],15),
        ("Run it without alternate recipients", "Select No alternates in Impact lab and run the same seeds.",
         "The gain in use disappears when no alternate receives food. A pilot should measure actual confirmations and where unplaced food ends up.",
         [(f"{no_alt_use:+.1f} kg","Use versus storage only",AMBER),("0 kg","Modeled redirects",WHITE),("Same seeds","Comparable offers and use shocks",WHITE)],13),
        ("Start with one receiving kitchen", "The workbook supplied the historical PEI weight profile. Operational inputs are simulated.",
         "Reconstruct one donation decision with an operator. Compare the quantities, staff effort, purchasing and completed handoffs.",
         [("81","Historical donor signups",WHITE),("22","Historical nonprofit signups",WHITE),
          ("98 pp","Published mix represented",LIME)],12),
    ]
    with TemporaryDirectory(prefix="rescuefit-walkthrough-") as folder:
        work=Path(folder)
        concat=[]
        for i,(title,subtitle,caption,metrics,seconds) in enumerate(scenes,1):
            frame,draw=screen(i,title,subtitle,caption)
            if metrics:
                tiles(draw,metrics)
            else:
                panel(draw,268,[(.5,"6 kg in the kitchen",LIME),(.5,"6 kg transferred","#9ad3c5")],
                      "The lot still balances to 12 kg. Recorded prep use remains zero.")
            frame.save(work/f"step-{i}.png")
            concat.extend([f"file 'step-{i}.png'",f"duration {seconds}"])
        concat.append("file 'step-8.png'")
        (work/"frames.txt").write_text("\n".join(concat)+"\n",encoding="utf-8")
        subprocess.run(["ffmpeg","-loglevel","error","-y","-f","concat","-safe","1","-i","frames.txt",
                        "-r","24","-c:v","libx264","-threads","2","-preset","fast","-crf","22","-pix_fmt","yuv420p",
                        "-movflags","+faststart",str(DOCS/"Innovation_RescueFit_4_ModelWalkthrough.mp4")],
                       cwd=work,check=True)


if __name__=="__main__":
    main()
