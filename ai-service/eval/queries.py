"""The 35 labelled client queries and 8 off-topic queries from
SentenceTransformer_Base.ipynb cells 47 and 54, copied verbatim. Shared by
build_index.py (to compute the no-good-match threshold) and run_eval.py (to
report retrieval metrics) so both always evaluate against the same set.
"""

EVAL_QUERIES = [
    ("I was dismissed from my job without notice and they refused to pay my terminal dues", "Employment & Labour"),
    ("My boss has not paid my salary for three months and now says I resigned", "Employment & Labour"),
    ("I was declared redundant but other people were kept on and I got no package", "Employment & Labour"),
    ("I was injured at the factory and the company says it is not responsible", "Employment & Labour"),
    ("They demoted me and cut my pay after I joined the union", "Employment & Labour"),
    ("Someone has fenced off part of my plot and claims the land is theirs", "Land & Property"),
    ("The seller took my money for a plot but refuses to transfer the title deed", "Land & Property"),
    ("My landlord locked my shop because I was late with rent", "Land & Property"),
    ("The county wants to evict us from land our family has lived on for forty years", "Land & Property"),
    ("There are two title deeds for the same piece of land and the other owner is building", "Land & Property"),
    ("My son was arrested and charged with robbery but he was at home that night", "Criminal"),
    ("The police are holding my brother and refusing to release him on bail", "Criminal"),
    ("I was convicted of stealing and want to appeal the sentence", "Criminal"),
    ("I am accused of defilement and I need to defend myself in court", "Criminal"),
    ("A relative was charged with murder after a fight at a bar", "Criminal"),
    ("My father died without a will and my uncles are taking his property", "Family & Succession"),
    ("I want a divorce and custody of our two children", "Family & Succession"),
    ("My husband sold our matrimonial home without my consent", "Family & Succession"),
    ("My stepmother is the administrator of the estate and is excluding us", "Family & Succession"),
    ("The father of my child refuses to pay child maintenance", "Family & Succession"),
    ("The government closed our business without giving us a chance to be heard", "Constitutional & Administrative"),
    ("A public body made a decision affecting me without following the law and I want it reviewed", "Constitutional & Administrative"),
    ("My constitutional rights were violated when officers raided my home", "Constitutional & Administrative"),
    ("The county revoked my licence unfairly and without reasons", "Constitutional & Administrative"),
    ("I want to challenge a new law that discriminates against people like me", "Constitutional & Administrative"),
    ("A supplier took a deposit and never delivered the goods in our contract", "Commercial & Contract"),
    ("The bank is auctioning my property over a loan I have been repaying", "Commercial & Contract"),
    ("My business partner breached our agreement and took the clients", "Commercial & Contract"),
    ("A company owes us money for work done and is now being wound up", "Commercial & Contract"),
    ("We signed a contract with an arbitration clause and the other side refuses to pay", "Commercial & Contract"),
    ("KRA has sent me a huge tax assessment that I think is wrong", "Tax"),
    ("We were charged VAT on goods that should be exempt", "Tax"),
    ("The tax authority froze our bank accounts over unpaid income tax", "Tax"),
    ("I want to object to the penalties and interest added to my tax bill", "Tax"),
    ("Customs valued our imported goods too high and charged extra duty", "Tax"),
]

OFF_TOPIC = [
    "How do I cook pilau for ten people",
    "Which phone has the best camera under 30,000 shillings",
    "What time does the Arsenal match start on Saturday",
    "How do I fix a slow laptop",
    "Recommend a good novel to read on holiday",
    "How do I grow sukuma wiki in a small garden",
    "What is the weather in Mombasa next week",
    "How do I make my matatu playlist louder",
]
