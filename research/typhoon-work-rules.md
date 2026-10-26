# Hong Kong typhoon work rules (researched 2026-10-26)

Primary source: Labour Department, _Code of Practice in Times of Adverse Weather
and "Extreme Conditions"_ (CoP), May 2026 edition,
<https://www.labour.gov.hk/eng/public/wcp/Rainstorm.pdf>. Quotes below are from
that edition unless marked. This is game-design research, not legal advice.

## 1. There is no statutory "typhoon holiday"

- The CoP is guidance. It asks employers and employees to agree the
  arrangements in advance, in the staff handbook or at hiring, and says
  employers "should not adopt a one-size-fits-all approach".
- The binding parts come from ordinances the CoP cites:
  - **Employment Ordinance:** an employer cannot cut annual leave, statutory
    holidays or rest days to make up hours lost to T8+, Black Rain or "extreme
    conditions". Deductions for unexplained absence must be "proportional to
    the time not worked", after allowing a reasonable travel time. It is also
    unlawful to change leave at the last minute to offset a coming T8.
  - **Employees' Compensation Ordinance:** while T8+, Red or Black Rain, or
    "extreme conditions" is in force, the employer is liable for an accident on
    a direct commute within **4 hours** before or after the working day.
  - **OSHO / FIUO:** a general duty to keep staff safe. Outdoor work must stop
    and workers must shelter.
- Pay: if the employer tells staff not to report, it "should not deduct their
  wages, good attendance bonus, or allowances", nor make them work the hours
  back later.

## 2. What decides the day off is _timing_, not duration

The CoP's reference table for "general staff" (Appendix 1):

| T8 or higher…                                     | What happens                                                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| in force **before working hours**                 | Employer should not require staff to report.                                                                                                                                                  |
| issued **during working hours**                   | On the **Pre-No. 8 Special Announcement** (HKO issues it when T8 is expected within 2 hours), staff are released in batches: pregnant, disabled, ferry-dependent and remote-area staff first. |
| **cancelled during working hours**                | Staff resume "according to the arrangements and time frame agreed in advance": "should return to work within **2 hours** as far as possible".                                                 |
| cancelled **close to the end of the working day** | "Employers should exempt employees from having to resume work."                                                                                                                               |
| still in force at the end of the day              | Release staff, or provide shelter at the workplace.                                                                                                                                           |

T1 and T3: report for duty as usual. Black Rain issued before work works like
T8. Indoor staff already at work keep working during Black Rain, because it can
be safer not to send people out.

The CoP leaves the "close to the end of the day" cut-off to each company. Its
own examples:

- Pharmaceutical maker: cancelled **after 1 pm**, nobody returns, full pay.
- Freight logistics: cancelled **before 1 pm**, office staff return.
- Media agency and IT firm: cancelled **after 2 pm**, staff work from home.
- Food manufacturer: cancelled **within 5 hours of the end of the day**, staff
  return within 2 hours. Late arrivals with proof keep full pay.
- Department store: report within 2 hours of cancellation, full pay for
  transport delays.

So an office worker on 9:00–18:00 gets the whole day if T8 is up before the
commute **and** stays up past the company cut-off (typically 13:00–14:00).
Lowered at 10:00, they are back at about 12:00. A T8 that ends at 05:00
Monday, or one on Sunday, gives nothing, because rest days are never made up.

## 3. "Extreme conditions" (極端情況)

- This is a Government announcement, made by the Chief Secretary on a steering
  committee's advice. It is for a super typhoon or similar disaster with
  widespread impact: large power cuts, many fallen windows, major landslides,
  widespread flooding, serious public-transport obstruction.
- It is announced **before** T8 is replaced by T3. It covers **2 hours after
  T8 is cancelled**: people stay where they are rather than head to work. By
  the end of those 2 hours, the Government says whether it is extended or
  ended. Sources: [2019 CoP revision](https://www.info.gov.hk/gia/general/201906/03/P2019060300406p.htm)
  and [LegCo paper 2021](https://www.legco.gov.hk/yr20-21/english/bc/bc54/papers/bc5420210312cb2-920-1-e.pdf).
- For work arrangements it counts the same as T8. The 2-hour return clock
  starts when "extreme conditions" **end**, not when T8 is lowered.

## 4. Exceptions that matter for jokes and flavour

- **Designated staff** (指定員工) must report even under T8. Examples are
  transport, security, property management and hotels. The employer should
  arrange transport or pay taxis, provide food, and pay an extra allowance.
  The CoP's examples range from a fixed hourly typhoon allowance to 0.5–1.5×
  basic salary to double overtime.
- **Work from home:** the CoP now encourages remote work, so many offices turn
  T8 into WFH rather than a day off. This is the source of
  「八號風球？公司話 WFH」.
- Staff who cannot get in on time because of transport should not be
  penalised or dismissed rashly.

## 5. What this means for the game

The current prototype adds up minutes of T8 between 09:00 and 18:00. The real
rules reward three key moments instead:

1. **Before the commute (about 07:30–08:00):** T8 must already be up, or the
   Pre-No. 8 announcement made, or you have to go to work.
2. **Holding past the cut-off (13:00 or 14:00):** if T8 drops before it, you
   are back at the desk 2 hours later. If it drops after it, the day is won.
3. **Super-typhoon damage → "extreme conditions":** an extra 2 hours, which
   can be extended, before the return clock starts.

Signals are also not instant. HKO gives the Pre-No. 8 Special Announcement
about 2 hours before T8, and does not flip signals back and forth from minute
to minute.
